-- ============================================================================
-- STATISTIK-AGGREGATION IN DER DATENBANK
-- ============================================================================
--
-- In den Supabase SQL-Editor kopieren und einmal ausführen. Mehrfaches
-- Ausführen ist unproblematisch (create ... if not exists / create or replace).
--
-- Vorher lud die App für Rangliste, Skill-Rating und "Letzte Matches" JEDEN
-- Wurf JEDES Matches in den Browser und rechnete dort. Jetzt rechnet die
-- Datenbank die Summen selbst und liefert pro Match nur eine kurze
-- Zusammenfassung ("Digest"):
--
--   * pro Spieler: Würfe, Treffer, Fehlwürfe, Becher, Treffer-Arten ...
--   * pro Team: welche Becher entfernt wurden (für Endstand und Rating)
--
-- Die Regeln, WELCHE Matches zählen (Gegner registriert, Statistik-Reset ...),
-- bleiben unverändert im App-Code (matchEligibility.ts, playerStats.ts).
-- Die Funktion rechnet nur die Summen, deshalb gibt es keine doppelte Logik.
--
-- Die Funktion läuft mit den Rechten des aufrufenden Nutzers (security
-- invoker). Row Level Security gilt also genau wie bei den bisherigen
-- Direktabfragen auf matches / match_players / actions / players.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) Indizes: machen das Zusammenfassen und das Laden einzelner Spieler schnell
-- ----------------------------------------------------------------------------

create index if not exists actions_match_id_action_index_idx
  on public.actions (match_id, action_index);

create index if not exists match_players_player_id_idx
  on public.match_players (player_id);

create index if not exists match_players_match_id_idx
  on public.match_players (match_id);

create index if not exists matches_created_at_idx
  on public.matches (created_at desc);


-- ----------------------------------------------------------------------------
-- 2) get_match_digests(): eine Zeile pro Match
-- ----------------------------------------------------------------------------
--
-- Spalten:
--   id          Match-ID (als Text)
--   created_at  gespeichert am
--   winner      'A', 'B' oder null
--   cups_a      Becher-IDs, die Team A dem Gegner entfernt hat (jsonb-Array)
--   cups_b      dasselbe für Team B
--   players     jsonb-Array, ein Eintrag pro Spieler mit seinen Summen
--
-- Zählregeln (identisch zu addAction in playerStats.ts):
--   * Strafbecher ("penalty") und umgeworfene Becher ("knockover") sind Aktionen
--     vom Typ "hit", zählen aber NICHT als Wurf. Ihre Becher zählen zu
--     cupsRemoved sowie penaltyCups bzw. knockedOverCups.
--   * Jede andere Aktion ist ein Wurf. "hit" = Treffer, "miss" = Fehlwurf.
--   * Treffer nach Art: single, bounce, trickshot.
-- ----------------------------------------------------------------------------

create or replace function public.get_match_digests()
returns table (
  id          text,
  created_at  timestamptz,
  winner      text,
  cups_a      jsonb,
  cups_b      jsonb,
  players     jsonb
)
language sql
stable
security invoker
set search_path = public
as $$
  with act as (
    -- cup_ids kann jsonb oder ein Zahlen-Array sein; to_jsonb macht beides zu jsonb
    select
      a.match_id,
      a.player_id,
      a.team::text        as team,
      a.action_type::text as action_type,
      a.hit_type::text    as hit_type,
      case
        when jsonb_typeof(to_jsonb(a.cup_ids)) = 'array' then to_jsonb(a.cup_ids)
        else '[]'::jsonb
      end                 as cups
    from public.actions a
  ),
  act_n as (
    select
      act.*,
      (
        select count(*)
        from jsonb_array_elements(act.cups) e
        where jsonb_typeof(e) = 'number'
      )::int as n_cups,
      (act.action_type = 'hit' and act.hit_type in ('penalty', 'knockover')) as non_throw
    from act
  ),
  per_player as (
    select
      match_id,
      player_id,
      count(*) filter (where not non_throw)::int                                         as throws,
      count(*) filter (where action_type = 'hit' and not non_throw)::int                 as hits,
      count(*) filter (where action_type = 'miss' and not non_throw)::int                as misses,
      coalesce(sum(n_cups) filter (where action_type = 'hit'), 0)::int                   as cups_removed,
      count(*) filter (where action_type = 'hit' and not non_throw and hit_type = 'single')::int    as single_hits,
      count(*) filter (where action_type = 'hit' and not non_throw and hit_type = 'bounce')::int    as bounce_hits,
      count(*) filter (where action_type = 'hit' and not non_throw and hit_type = 'trickshot')::int as trickshot_hits,
      coalesce(sum(n_cups) filter (where non_throw and hit_type = 'penalty'), 0)::int    as penalty_cups,
      coalesce(sum(n_cups) filter (where non_throw and hit_type <> 'penalty'), 0)::int   as knocked_over_cups
    from act_n
    group by match_id, player_id
  ),
  team_cups as (
    select
      act.match_id,
      act.team,
      jsonb_agg(distinct e order by e) as ids
    from act
    cross join lateral jsonb_array_elements(act.cups) e
    where act.action_type = 'hit'
      and jsonb_typeof(e) = 'number'
    group by act.match_id, act.team
  ),
  match_cups as (
    select
      match_id,
      max(ids::text) filter (where team = 'A') as a_ids,
      max(ids::text) filter (where team = 'B') as b_ids
    from team_cups
    group by match_id
  ),
  match_players_agg as (
    select
      mp.match_id,
      jsonb_agg(
        jsonb_build_object(
          'id',              mp.player_id::text,
          'name',            coalesce(p.name, 'Unbekannter Spieler'),
          'team',            mp.team::text,
          'throws',          coalesce(pp.throws, 0),
          'hits',            coalesce(pp.hits, 0),
          'misses',          coalesce(pp.misses, 0),
          'cupsRemoved',     coalesce(pp.cups_removed, 0),
          'singleHits',      coalesce(pp.single_hits, 0),
          'bounceHits',      coalesce(pp.bounce_hits, 0),
          'trickshotHits',   coalesce(pp.trickshot_hits, 0),
          'penaltyCups',     coalesce(pp.penalty_cups, 0),
          'knockedOverCups', coalesce(pp.knocked_over_cups, 0)
        )
        order by mp.player_id::text
      ) as players
    from public.match_players mp
    left join public.players p
      on p.id = mp.player_id
    left join per_player pp
      on pp.match_id = mp.match_id
     and pp.player_id = mp.player_id
    group by mp.match_id
  )
  select
    m.id::text,
    m.created_at,
    m.winner::text,
    coalesce(mc.a_ids::jsonb, '[]'::jsonb),
    coalesce(mc.b_ids::jsonb, '[]'::jsonb),
    coalesce(mpa.players, '[]'::jsonb)
  from public.matches m
  left join match_cups mc
    on mc.match_id = m.id
  left join match_players_agg mpa
    on mpa.match_id = m.id
  order by m.created_at desc, m.id desc;
$$;

grant execute on function public.get_match_digests() to authenticated, anon;

-- PostgREST (die Supabase-API) soll die neue Funktion sofort kennen
notify pgrst, 'reload schema';

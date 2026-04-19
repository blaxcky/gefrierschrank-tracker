# Supabase Setup

## 1. Projekt anlegen

1. Neues Supabase-Projekt erstellen.
2. Unter `Authentication > Providers` den Provider `Email` aktivieren.
3. Wenn ihr kein SMTP fur Bestatigungs-E-Mails einrichten wollt:
   unter `Authentication > Providers > Email` die Mail-Bestatigung deaktivieren.
4. Unter `Authentication > URL Configuration` mindestens diese URLs eintragen:
   - `http://localhost:5173`
   - eure Produktions-URL, z. B. `https://<user>.github.io/gefrierschrank-tracker`

## 2. Schema anlegen

1. In Supabase den `SQL Editor` offnen.
2. Den Inhalt aus `supabase/schema.sql` komplett ausfuhren.
3. Falls das Projekt schon lauft und Login bisher an `public.profiles` gescheitert ist:
   das aktualisierte Schema erneut ausfuhren, damit die neue `INSERT`-Policy auf `public.profiles` angelegt wird.

Danach existieren:

- `profiles`
- `households`
- `household_members`
- `freezers`
- `drawers`
- `items`
- `tags`
- `sync_conflicts`

## 3. App mit Supabase verbinden

1. `.env.example` nach `.env.local` kopieren.
2. `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` aus `Project Settings > API` eintragen.

## 4. Gemeinsamen Haushalt anlegen

Im SQL Editor:

```sql
insert into public.households (name)
values ('Unser Gefrierschrank')
returning id, name;
```

Die `id` aus dem Ergebnis notieren.

## 5. Nutzer in Supabase anlegen

1. Du legst dich und deinen Freund in `Authentication > Users` manuell an.
2. Weise jedem Nutzer ein Passwort zu oder verschicke einen Passwort-Reset.

Wichtig: Die App bietet keinen Self-Signup an. Ein Nutzer muss zuerst in `auth.users` existieren.

Falls bereits Nutzer in `auth.users` existieren, aber noch kein Eintrag in `public.profiles` vorhanden ist, einmalig im SQL Editor ausfuhren:

```sql
insert into public.profiles (id, email, display_name)
select
  u.id,
  coalesce(u.email, ''),
  nullif(u.raw_user_meta_data ->> 'display_name', '')
from auth.users u
on conflict (id) do update
set
  email = excluded.email,
  display_name = coalesce(excluded.display_name, public.profiles.display_name);
```

## 6. Zugriff auf den Haushalt freischalten

Sobald beide Konten in Supabase Auth existieren, im SQL Editor ausfuhren:

```sql
insert into public.household_members (household_id, user_id, role)
select
  '<HOUSEHOLD_ID>'::uuid,
  u.id,
  'owner'
from auth.users u
where lower(u.email) = lower('deine-email@example.com')
on conflict (household_id, user_id) do update set role = excluded.role;
```

```sql
insert into public.household_members (household_id, user_id, role)
select
  '<HOUSEHOLD_ID>'::uuid,
  u.id,
  'member'
from auth.users u
where lower(u.email) = lower('freund@example.com')
on conflict (household_id, user_id) do update set role = excluded.role;
```

Danach konnen sich beide normal in der App anmelden.

## 7. Wie der Login funktioniert

- Jeder meldet sich mit der eigenen E-Mail und dem eigenen Passwort an.
- Die App pruft nach dem Login, ob `auth.uid()` in `household_members` steht.
- Falls kein Eintrag existiert, erscheint die Ansicht `Zugang noch nicht freigeschaltet`.
- Falls ein Eintrag existiert, wird der gemeinsame Haushalt geladen und mit Dexie synchronisiert.

## 8. Konflikte bereinigen

- Gleichzeitige Anderungen werden zuerst automatisch aufgelost.
- Dabei wird ein Konflikteintrag in `sync_conflicts` gespeichert.
- In der App gibt es die Seite `Sync-Konflikte`, auf der ihr `Lokal behalten` oder `Cloud behalten` auswahlen konnt.

## 9. Empfohlener Test

1. App auf zwei Geraten oder in zwei Browsern anmelden.
2. Auf Gerat A einen Artikel anlegen.
3. Auf Gerat B synchronisieren und denselben Artikel bearbeiten.
4. Auf Gerat A denselben Artikel ebenfalls bearbeiten.
5. Beide synchronisieren.
6. In `Sync-Konflikte` prufen, ob der Datensatz zur manuellen Bereinigung erscheint.

# Database Schema

This folder is for sharing the MySQL table structure without copying private data.

## What is included

- `schema.sql` creates the app's database tables.
- The file contains structure only.
- It does not include users, password hashes, listings, scrape rows, credit applications, or reports.

## Import on another machine

1. Create an empty MySQL database:

```powershell
mysql --host=127.0.0.1 --port=3306 --user=root --password --execute="CREATE DATABASE IF NOT EXISTS bh_market CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

2. Import the schema:

```powershell
cmd /c "mysql --host=127.0.0.1 --port=3306 --user=root --password bh_market < sql\schema.sql"
```

3. Create or update `apps/server/.env` on that machine:

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=bh_market
```

4. Start the server from `apps/server`:

```powershell
npm run dev
```

## Regenerate from a live database

If MySQL and `mysqldump` are available locally, regenerate the structure-only schema with:

```powershell
mysqldump --host=127.0.0.1 --port=3306 --user=root --password --no-data --skip-comments --result-file=sql/schema.sql bh_market
```

Use the real database name in place of `bh_market` if your `.env` uses a different `MYSQL_DATABASE`.

## Notes

- `schema.sql` intentionally avoids `DROP TABLE` statements so it is safer to inspect and import.
- The imported database starts empty. Create admin/client/agent users through your normal admin workflow or with a separate private seed file that is not committed.
- Default scrape-site rows are not included because this folder is data-free.

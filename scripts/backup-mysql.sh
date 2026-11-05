#!/usr/bin/env bash
# Logical MySQL backup -> gzip -> (optional) S3. Run from cron:  15 2 * * * /opt/hbs/scripts/backup-mysql.sh >> /var/log/hbs-backup.log 2>&1
# Needs: mysqldump, gzip, (aws cli + S3_BACKUP_BUCKET for offsite). RDS automated snapshots should ALSO be enabled.
set -euo pipefail
: "${DB_HOST:?}" "${DB_USER:?}" "${DB_PASS:?}" "${DB_NAME:=hbs_workspace}"
DIR="${BACKUP_DIR:-/var/backups/hbs}"; KEEP_DAYS="${KEEP_DAYS:-14}"; TS="$(date +%Y%m%d-%H%M%S)"; FILE="$DIR/${DB_NAME}-$TS.sql.gz"
mkdir -p "$DIR"; umask 077
MYSQL_PWD="$DB_PASS" mysqldump -h "$DB_HOST" -u "$DB_USER" --single-transaction --routines --triggers --set-gtid-purged=OFF "$DB_NAME" | gzip -9 > "$FILE"
gzip -t "$FILE" && echo "backup ok: $FILE ($(du -h "$FILE" | cut -f1))"
[ -n "${S3_BACKUP_BUCKET:-}" ] && aws s3 cp "$FILE" "s3://$S3_BACKUP_BUCKET/mysql/$(basename "$FILE")" --sse AES256
find "$DIR" -name "${DB_NAME}-*.sql.gz" -mtime +"$KEEP_DAYS" -delete

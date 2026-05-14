#!/usr/bin/env bash
# Gemel Tracker — API helper script
# Usage: ./scripts/gemel-api.sh <command> [args...]
#
# Commands:
#   get-funds
#   get-entries [fund_id]
#   get-entry <fund_id> <date>
#   add-entry <fund_id> <date> <price>
#   add-deposit <fund_id> <date> <price> <flow>
#   add-withdrawal <fund_id> <date> <price_was>
#   delete-entry <fund_id> <date>

BASE="https://sfzkmvxpdllikbinhzhu.supabase.co/rest/v1"
ANON="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmemttdnhwZGxsaWtiaW5oemh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3Mzg0ODcsImV4cCI6MjA5NDMxNDQ4N30.Lb_WMyXYyqBnImjFx6tVQSOkroOZ4WSV7i4bwj3ji5M"
SVC="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmemttdnhwZGxsaWtiaW5oemh1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODczODQ4NywiZXhwIjoyMDk0MzE0NDg3fQ.zhtL513TEXUTDPcggnBU33xwblvO5bWH_V1XDoz3pcY"

READ_HEADERS=(-H "apikey: $ANON" -H "Authorization: Bearer $ANON")
WRITE_HEADERS=(-H "apikey: $SVC" -H "Authorization: Bearer $SVC" -H "Content-Type: application/json" -H "Prefer: resolution=merge-duplicates")

case "$1" in

  get-funds)
    curl -s "$BASE/funds?select=*" "${READ_HEADERS[@]}"
    ;;

  get-entries)
    if [ -n "$2" ]; then
      curl -s "$BASE/entries?fund_id=eq.$2&order=date" "${READ_HEADERS[@]}"
    else
      curl -s "$BASE/entries?select=*&order=date" "${READ_HEADERS[@]}"
    fi
    ;;

  get-entry)
    # args: <fund_id> <date>   e.g. yelin 2026-05-01
    curl -s "$BASE/entries?fund_id=eq.$2&date=eq.$3" "${READ_HEADERS[@]}"
    ;;

  add-entry)
    # args: <fund_id> <date> <price>   e.g. yelin 2026-07-01 185000
    curl -s -X POST "$BASE/entries" "${WRITE_HEADERS[@]}" \
      -d "{\"fund_id\":\"$2\",\"date\":\"$3\",\"price\":$4}"
    ;;

  add-deposit)
    # args: <fund_id> <date> <price> <flow>   e.g. yelin 2026-07-01 235000 50000
    curl -s -X POST "$BASE/entries" "${WRITE_HEADERS[@]}" \
      -d "{\"fund_id\":\"$2\",\"date\":\"$3\",\"price\":$4,\"note\":\"deposit\",\"flow\":$5}"
    ;;

  add-withdrawal)
    # args: <fund_id> <date> <price_was>   e.g. yelin 2026-07-01 185000
    # price_was = the final value withdrawn (price becomes 0, flow is negative)
    curl -s -X POST "$BASE/entries" "${WRITE_HEADERS[@]}" \
      -d "{\"fund_id\":\"$2\",\"date\":\"$3\",\"price\":0,\"note\":\"withdrawal\",\"flow\":-$4}"
    ;;

  delete-entry)
    # args: <fund_id> <date>   e.g. yelin 2026-07-01
    curl -s -X DELETE "$BASE/entries?fund_id=eq.$2&date=eq.$3" \
      -H "apikey: $SVC" -H "Authorization: Bearer $SVC"
    ;;

  *)
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "  get-funds"
    echo "  get-entries [fund_id]"
    echo "  get-entry <fund_id> <date>"
    echo "  add-entry <fund_id> <date> <price>"
    echo "  add-deposit <fund_id> <date> <price> <flow>"
    echo "  add-withdrawal <fund_id> <date> <price_was>"
    echo "  delete-entry <fund_id> <date>"
    exit 1
    ;;
esac

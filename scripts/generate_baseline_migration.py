#!/usr/bin/env python3
"""
Extracts public schema DDL from supabase/schema.sql and generates
supabase/migrations/20251113000000_initial_schema.sql as a baseline migration.

Supabase Preview branches run migrations against a blank DB, so the first
migration must create all tables, types, functions, policies, etc.
"""

import re
import sys
from pathlib import Path

SCHEMA_FILE = Path(__file__).parent.parent / "supabase" / "schema.sql"
OUTPUT_FILE = Path(__file__).parent.parent / "supabase" / "migrations" / "20251113000000_initial_schema.sql"

# Supabase manages these itself — skip them in migrations
SKIP_SCHEMAS = {"auth", "storage", "realtime", "pgbouncer", "extensions", "graphql", "graphql_public", "vault", "supabase_migrations"}

# Order of types to emit (types first so tables can reference them)
TYPE_ORDER = ["TYPE", "TABLE", "SEQUENCE", "VIEW", "MATERIALIZED VIEW", "FUNCTION", "AGGREGATE", "TRIGGER", "INDEX", "CONSTRAINT", "FK CONSTRAINT", "POLICY", "RULE", "COMMENT", "DEFAULT", "DEFAULT ACL", "ROW SECURITY"]


def parse_blocks(content: str) -> list[dict]:
    """Parse pg_dump output into blocks with metadata."""
    blocks = []
    
    # Split on pg_dump section headers
    # Pattern: \n--\n-- Name: ...; Type: ...; Schema: ...; Owner: -\n--\n
    header_pattern = re.compile(
        r'\n--\n-- (Name: .+?; Type: .+?; Schema: .+?; Owner: .*?)\n--\n',
        re.DOTALL
    )
    
    parts = header_pattern.split(content)
    
    # parts[0] is content before first block (preamble)
    # Then alternating: header_line, content_block
    i = 1
    while i < len(parts) - 1:
        header_line = parts[i]
        block_content = parts[i + 1] if i + 1 < len(parts) else ""
        
        # Parse header
        name_match = re.search(r'Name: (.*?); Type: (.*?); Schema: (.*?); Owner:', header_line)
        if name_match:
            name = name_match.group(1).strip()
            obj_type = name_match.group(2).strip()
            schema = name_match.group(3).strip()
            
            # Get only the SQL statements (trim trailing whitespace/blank lines)
            sql = block_content.rstrip()
            
            blocks.append({
                "name": name,
                "type": obj_type,
                "schema": schema,
                "header": f"-- Name: {name}; Type: {obj_type}; Schema: {schema}",
                "sql": sql,
            })
        
        i += 2
    
    return blocks


def should_include(block: dict) -> bool:
    """Determine if a block should be included in the baseline migration."""
    schema = block["schema"]
    obj_type = block["type"]
    sql = block["sql"].strip()
    
    # Skip non-public schemas
    if schema not in ("public", "-"):
        return False
    
    # For schema="-", only include if it's for the public schema (like SCHEMA public itself)
    if schema == "-":
        # Skip — Supabase creates these automatically
        return False
    
    # Skip if no actual SQL content
    if not sql:
        return False
    
    # Skip SET commands alone
    if sql.startswith("SET ") and "\n" not in sql:
        return False
    
    return True


def get_type_priority(obj_type: str) -> int:
    """Return sort priority for object types (lower = earlier)."""
    priorities = {
        "TYPE": 10,
        "DOMAIN": 11,
        "SEQUENCE": 20,
        "TABLE": 30,
        "VIEW": 40,
        "MATERIALIZED VIEW": 41,
        "FUNCTION": 50,
        "PROCEDURE": 51,
        "AGGREGATE": 52,
        "TRIGGER": 60,
        "INDEX": 70,
        "CONSTRAINT": 80,
        "FK CONSTRAINT": 85,
        "POLICY": 90,
        "ROW SECURITY": 91,
        "RULE": 92,
        "DEFAULT": 95,
        "COMMENT": 99,
        "DEFAULT ACL": 100,
        "ACL": 101,
    }
    return priorities.get(obj_type, 50)


def main():
    if not SCHEMA_FILE.exists():
        print(f"ERROR: {SCHEMA_FILE} not found", file=sys.stderr)
        sys.exit(1)
    
    print(f"Reading {SCHEMA_FILE}...")
    content = SCHEMA_FILE.read_text(encoding="utf-8")
    
    print("Parsing blocks...")
    blocks = parse_blocks(content)
    print(f"  Found {len(blocks)} total blocks")
    
    # Filter to public schema only
    public_blocks = [b for b in blocks if should_include(b)]
    print(f"  Keeping {len(public_blocks)} public schema blocks")
    
    # Sort by type priority (stable sort preserves original ordering within same type)
    public_blocks.sort(key=lambda b: get_type_priority(b["type"]))
    
    # Count by type
    type_counts: dict[str, int] = {}
    for b in public_blocks:
        type_counts[b["type"]] = type_counts.get(b["type"], 0) + 1
    
    print("\nObject counts by type:")
    for t, c in sorted(type_counts.items(), key=lambda x: get_type_priority(x[0])):
        print(f"  {t}: {c}")
    
    # Generate migration file
    lines = [
        "-- =============================================================================",
        "-- BASELINE SCHEMA MIGRATION",
        "-- Generated from supabase/schema.sql",
        "-- This migration creates all public schema objects from scratch so that",
        "-- Supabase Preview Branches can run migrations against a blank database.",
        "-- =============================================================================",
        "",
        "-- Extensions are managed by Supabase platform, but ensure pgcrypto is available",
        "CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;",
        "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\" WITH SCHEMA extensions;",
        "",
        "SET search_path = public;",
        "",
    ]
    
    current_type = None
    for block in public_blocks:
        # Add section divider when type changes
        if block["type"] != current_type:
            current_type = block["type"]
            lines.append("")
            lines.append(f"-- ============================================================")
            lines.append(f"-- {current_type}S")
            lines.append(f"-- ============================================================")
            lines.append("")
        
        lines.append(f"-- {block['header']}")
        lines.append("")
        sql = block["sql"].strip()
        if sql:
            lines.append(sql)
            lines.append("")
    
    output = "\n".join(lines)
    
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(output, encoding="utf-8")
    
    line_count = output.count("\n")
    print(f"\n✅ Written to {OUTPUT_FILE}")
    print(f"   {line_count} lines, {len(output):,} bytes")
    print(f"\nMigration order:")
    print(f"  1. {OUTPUT_FILE.name}  ← baseline (all tables/types/functions/policies)")
    print(f"  2. 20251114170547_fix_launch_simulation_for_super_admin.sql")
    print(f"  3. 20251118000000_allow_students_to_see_assigned_simulations.sql")


if __name__ == "__main__":
    main()

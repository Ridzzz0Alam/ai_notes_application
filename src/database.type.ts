DESCRIPTION
  Run code generation tools.

USAGE
  supabase gen <subcommand> [flags]

GLOBAL FLAGS
  --help, -h                                                          Show help information
  --version, -v                                                       Show version information
  --completions <bash|zsh|fish|sh>                                    Print shell completion script (choices: bash, zsh, fish, sh)
  --log-level <all|trace|debug|info|warn|warning|error|fatal|none>    Sets the minimum log level (choices: all, trace, debug, info, warn, warning, error, fatal, none)
  --output-format choice                                              Output format: text (default), json, or stream-json (NDJSON) (choices: text, json, stream-json)
  --output, -o choice                                                 Output format of status variables. (choices: env, pretty, json, toml, yaml, table, csv)
  --profile string                                                    Use a specific profile for connecting to Supabase API.
  --debug                                                             Output debug logs to stderr.
  --workdir string                                                    Path to a Supabase project directory.
  --experimental                                                      Enable experimental features.
  --network-id string                                                 Use the specified Docker network instead of a generated one.
  --yes                                                               Answer yes to all prompts.
  --dns-resolver choice                                               Look up domain names using the specified resolver. (choices: native, https)
  --create-ticket                                                     Create a support ticket for any CLI error.
  --agent choice                                                      Override agent detection: yes, no, or auto (default auto). (choices: auto, yes, no)

SUBCOMMANDS
  types          Generate types from Postgres schema
  signing-key    Generate a JWT signing key
  bearer-jwt     Generate a Bearer Auth JWT for accessing Data API
  keys           Generate keys for preview branch (experimental)

default:
    @just --list

hooks:
    @devenv tasks run devenv:git-hooks:run

deploy *ARGS:
    npm run deploy -- {{ARGS}}

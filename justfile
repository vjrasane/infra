default:
    @just --list

hooks:
    @devenv tasks run devenv:git-hooks:run

deploy target='':
    npm run deploy -- {{target}}

default:
    @just --list

hooks:
    @devenv tasks run devenv:git-hooks:run

deploy target='all':
    ansible-playbook ansible/site.yml --skip-tags setup --limit {{target}}

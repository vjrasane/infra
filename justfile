# Download external dependencies (dashboards, etc.)
download:
    @mkdir -p dashboards
    @echo "Downloading Traefik dashboard..."
    @curl -sL "https://grafana.com/api/dashboards/17346/revisions/latest/download" -o dashboards/traefik.json
    @echo "Done."

# Fetch the Headlamp admin token
headlamp-token:
    @kubectl get secret headlamp-admin-token -n headlamp -o jsonpath='{.data.token}' | base64 -d && echo

apply:
    @npm run synth
    @kubectl apply -f dist/

hooks:
    @devenv tasks run devenv:git-hooks:run

ansible target='all':
    ANSIBLE_CONFIG=ansible/ansible.cfg ansible-playbook ansible/playbook.yml --limit {{target}}

backup-psql:
    #!/usr/bin/env bash
    set -e
    TIMESTAMP=$(date +%s)
    DAILY_JOB="manual-daily-backup-$TIMESTAMP"
    RESTIC_JOB="manual-restic-backup-$TIMESTAMP"
    echo "Starting daily pg_dump backup..."
    kubectl create job --from=cronjob/postgres-daily-backup $DAILY_JOB -n postgres
    kubectl wait --for=condition=complete job/$DAILY_JOB -n postgres --timeout=300s
    echo "Daily backup complete. Starting restic backup..."
    kubectl create job --from=cronjob/postgres-backup $RESTIC_JOB -n postgres
    kubectl wait --for=condition=complete job/$RESTIC_JOB -n postgres --timeout=600s
    echo "Restic backup complete."
    kubectl logs -n postgres job/$RESTIC_JOB --tail=10

restore-psql:
    #!/usr/bin/env bash
    set -e
    kubectl delete job -n postgres postgres-restore-manual --ignore-not-found
    kubectl create job --from=cronjob/postgres-restore -n postgres postgres-restore-manual
    kubectl wait --for=condition=complete job/postgres-restore-manual -n postgres --timeout=600s
    echo "Restore complete."
    kubectl logs -n postgres job/postgres-restore-manual

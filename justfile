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

backup-pqsl:
    #!/usr/bin/env bash
    set -e
    TIMESTAMP=$(date +%s)
    DAILY_JOB="manual-daily-backup-$TIMESTAMP"
    WEEKLY_JOB="manual-weekly-backup-$TIMESTAMP"
    echo "Starting daily pg_dump backup..."
    kubectl create job --from=cronjob/postgres-daily-backup $DAILY_JOB -n postgres
    kubectl wait --for=condition=complete job/$DAILY_JOB -n postgres --timeout=300s
    echo "Daily backup complete. Starting restic backup to B2..."
    kubectl create job --from=cronjob/postgres-weekly-backup $WEEKLY_JOB -n postgres
    kubectl wait --for=condition=complete job/$WEEKLY_JOB -n postgres --timeout=600s
    echo "Restic backup complete."
    kubectl logs -n postgres job/$WEEKLY_JOB --tail=10

# Download external dependencies (dashboards, etc.)
download:
    @mkdir -p dashboards
    @echo "Downloading Traefik dashboard..."
    @curl -sL "https://grafana.com/api/dashboards/17346/revisions/latest/download" -o dashboards/traefik.json
    @echo "Done."

# Fetch the Headlamp admin token
headlamp-token:
    @kubectl get secret headlamp-admin-token -n headlamp -o jsonpath='{.data.token}' | base64 -d && echo

# Synth a single chart or all charts
synth chart='':
    @if [ -z "{{chart}}" ]; then \
        cdk8s synth; \
    else \
        cdk8s synth --app "npx ts-node charts/{{chart}}.ts"; \
    fi

# Apply a single chart or all charts
apply chart='': (synth chart)
    @if [ -z "{{chart}}" ]; then \
        kubectl apply -f dist/; \
    else \
        kubectl apply -f dist/{{chart}}.k8s.yaml; \
    fi


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

wmill *args:
    cd windmill && npx windmill-cli@latest {{args}}

wmill-push:
    cd windmill && npx windmill-cli@latest script generate-metadata && npx windmill-cli@latest sync push

wmill-pull:
    cd windmill && npx windmill-cli@latest sync pull --skip-secrets --skip-variables --skip-resources

restore-psql:
    #!/usr/bin/env bash
    set -e
    kubectl delete job -n postgres postgres-restore-manual --ignore-not-found
    kubectl create job --from=cronjob/postgres-restore -n postgres postgres-restore-manual
    kubectl wait --for=condition=complete job/postgres-restore-manual -n postgres --timeout=600s
    echo "Restore complete."
    kubectl logs -n postgres job/postgres-restore-manual

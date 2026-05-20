#!/usr/bin/env bash
# OpenShift'e H2 profiliyle deploy (en basit yol)
# Kullanım: ./openshift/deploy.sh <registry>/<namespace>/financial-analysis:latest

set -euo pipefail

IMAGE="${1:-financial-analysis:latest}"
NAMESPACE="${OC_NAMESPACE:-$(oc project -q)}"

echo "==> Namespace: $NAMESPACE"
echo "==> Image: $IMAGE"

# Image adını deployment.yaml içindeki placeholder'la değiştir
DEPLOY_YAML=$(sed "s|financial-analysis:latest|$IMAGE|g" "$(dirname "$0")/deployment.yaml")

echo "==> PVC oluşturuluyor..."
oc apply -f "$(dirname "$0")/pvc.yaml"

echo "==> Deployment uygulanıyor..."
echo "$DEPLOY_YAML" | oc apply -f -

echo "==> Service uygulanıyor..."
oc apply -f "$(dirname "$0")/service.yaml"

echo "==> Route oluşturuluyor..."
oc apply -f "$(dirname "$0")/route.yaml"

echo "==> Rollout bekleniyor..."
oc rollout status deployment/financial-analysis

echo ""
echo "==> Uygulama URL:"
oc get route financial-analysis -o jsonpath='https://{.spec.host}{"\n"}'

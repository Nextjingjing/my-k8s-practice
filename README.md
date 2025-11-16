# Kubernetes Deployment with Minikube (Multi-Node)

โปรเจกต์นี้เป็นตัวอย่างการตั้งค่า Kubernetes Cluster แบบ Multi-Node ด้วย
**Minikube + Docker driver** บน Windows พร้อมการ deploy **PostgreSQL
(StatefulSet)** และ **Backend Service** ที่เชื่อมต่อฐานข้อมูลผ่าน Secret
และเปิดการเข้าถึงผ่าน **Ingress Nginx**

## 🚀 1. สร้าง Minikube Cluster (3 Nodes)

``` bash
minikube start --driver=docker --nodes 3
```

ตรวจสอบ:

``` bash
minikube status
kubectl get node
```

## 🏷️ 2. เพิ่ม Label ให้ Worker Nodes

``` bash
kubectl label node minikube-m02 node-role.kubernetes.io/worker=worker
kubectl label node minikube-m03 node-role.kubernetes.io/worker=worker
```

## 🔐 3. สร้าง Secret PostgreSQL

``` yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
type: Opaque
data:
  POSTGRES_PASSWORD: cGFzczEyMw==
```

## 💾 4. สร้าง Persistent Volume

``` bash
minikube ssh -n minikube-m02
sudo mkdir -p /mnt/data
sudo chmod 777 /mnt/data
```

## 🗄️ 5. Deploy PostgreSQL (StatefulSet)

ไฟล์ postgres.yaml ตามโปรเจกต์ของคุณ

## 🔐 6. Secret สำหรับ Backend

``` yaml
apiVersion: v1
kind: Secret
metadata:
  name: backend-secret
type: Opaque
data:
  DATABASE_URL: cG9zdGdyZXNxbDovL3Bvc3RncmVzOnBhc3MxMjNAcG9zdGdyZXMtc3ZjOjU0MzIvbXlkYj9zY2hlbWE9cHVibGlj
```

## 📦 7. Deploy Backend

Deployment + Service ในไฟล์ backend.yaml

## 🌐 8. เปิด Ingress Nginx

``` bash
minikube addons enable ingress
minikube tunnel
```

## 🌍 9. Ingress Backend

เพิ่มใน hosts:

    127.0.0.1 backend.local

## ✔️ 10. ทดสอบ

``` bash
curl http://backend.local/words
```

## 📂 โครงสร้างไฟล์

    k8s/
     ├── postgres-secret.yaml
     ├── pv.yaml
     ├── postgres.yaml
     ├── backend-secret.yaml
     ├── backend.yaml
     └── backend-ingress.yaml

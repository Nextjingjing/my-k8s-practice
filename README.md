การสร้าง Cluster

$ minikube start --driver=docker --nodes 3
เนื่องจากผมใช้ Window แล้วใช้ driver แบบ vm แล้วพังบ่อย จึงเลือก Docker
สร้าง 3 node ได้แก่ 1 master + 2 workers
$ minikube status
minikube
type: Control Plane
host: Running
kubelet: Running
apiserver: Running
kubeconfig: Configured

minikube-m02
type: Worker
host: Running
kubelet: Running

minikube-m03
type: Worker
host: Running
kubelet: Running


$ kubectl get node
NAME           STATUS   ROLES           AGE     VERSION
minikube       Ready    control-plane   4m39s   v1.34.0
minikube-m02   Ready    <none>          3m40s   v1.34.0
minikube-m03   Ready    <none>          2m44s   v1.34.0
ยังไม่ label เป็น worker
$ kubectl label node minikube-m02 node-role.kubernetes.io/worker=worker
node/minikube-m02 labeled

$ kubectl label node minikube-m03 node-role.kubernetes.io/worker=worker
node/minikube-m03 labeled
$ kubectl get node
NAME           STATUS   ROLES           AGE     VERSION
minikube       Ready    control-plane   6m26s   v1.34.0
minikube-m02   Ready    worker          5m27s   v1.34.0
minikube-m03   Ready    worker          4m31s   v1.34.0
สร้าง StatefulSet ของ Database

ไฟล์ postgres-secret.yaml

apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
type: Opaque
data:
  POSTGRES_PASSWORD: cGFzczEyMw== # pass123
สร้าง Secret เพื่อซ่อนจาก pods
สร้าง Persistent Volume

เราจะใช้ Physical storage ที่เป็น Local Storage เพื่อความง่าย โดยเราจะใช้ Disk ของ minikube-m02 เป็นที่เก็บข้อมูล
$ minikube ssh -n minikube-m02
$ sudo mkdir -p /mnt/data
$ sudo chmod 777 /mnt/data
เรา ssh เข้าไปในคอมและสร้าง path เก็บของและจัดการ permission ให้เรียบร้อย
ไฟล์ pv.yaml

apiVersion: v1
kind: PersistentVolume
metadata:
  name: mypv
spec:
  capacity:
    storage: 1Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Delete
  storageClassName: slow
  local:
    path: /mnt/data
  nodeAffinity:
    required:
      nodeSelectorTerms:
        - matchExpressions:
            - key: kubernetes.io/hostname
              operator: In
              values:
                - minikube-m02
เก็บที่ node minikube-m02 และที่ path /mnt/data
ไฟล์ postgres.yaml

apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-statefulset
spec:
  serviceName: postgres-svc
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:17
        ports:
        - containerPort: 5432
          name: database
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: POSTGRES_PASSWORD
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: slow
      resources:
        requests:
          storage: 1Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-svc
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
สร้างแค่ 1 pods ปล. ถ้าสร้างหลาย pods มันจะยากมากๆ งั้นเอาแค่นี้ก่อน
สร้าง service ชื่อ postgres-svc
ตรวจสอบ
$ kubectl get pods
NAME                     READY   STATUS    RESTARTS   AGE
postgres-statefulset-0   1/1     Running   0          4m6s
$ kubectl get svc 
NAME           TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)    AGE
kubernetes     ClusterIP   10.96.0.1    <none>        443/TCP    17h
postgres-svc   ClusterIP   None         <none>        5432/TCP   21m
โอเคครบ
สร้าง Deployment ของ Backend

เนื่องจาก backend ของผม ผมได้สร้าง image และ push ลงไปใน docker hub แล้ว และ image ตัวนี้ต้อง Environment Variable แค่ DATABASE_URL เท่านั้นเอง

ชื่อ image: nextjingjing/k8s-backend
ไฟล์ backend-secret.yaml

apiVersion: v1
kind: Secret
metadata:
  name: backend-secret
type: Opaque
data:
  # postgresql://postgres:pass123@postgres-svc:5432/mydb?schema=public
  DATABASE_URL: cG9zdGdyZXNxbDovL3Bvc3RncmVzOnBhc3MxMjNAcG9zdGdyZXMtc3ZjOjU0MzIvbXlkYj9zY2hlbWE9cHVibGlj
Become a member
postgresql://postgres:pass123@postgres-svc:5432/mydb?schema=public ตั้งให้ตรงกับชื่อ service และใส่รหัสไปด้วย และเข้ารหัส Base64
ไฟล์ backend.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: nextjingjing/k8s-backend
        ports:
        - containerPort: 3000 # อันนี้แอพผมบังคับ 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: backend-secret
              key: DATABASE_URL
---
apiVersion: v1
kind: Service
metadata:
  name: backend-svc
spec:
  type: ClusterIP
  selector:
    app: backend
  ports:
    - port: 3000
      targetPort: 3000
ตรวจสอบ
$ kubectl get pods
NAME                       READY   STATUS    RESTARTS   AGE
backend-68c787b8cb-cd5sv   1/1     Running   0          16s
backend-68c787b8cb-kzvtv   1/1     Running   0          16s
postgres-statefulset-0     1/1     Running   0          47m

$ kubectl logs backend-68c787b8cb-cd5sv
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "mydb", schema "public" at "postgres-svc:5432"

1 migration found in prisma/migrations


No pending migrations to apply.

> k8s-backend@1.0.0 start
> node server.js

✅ Connected to database!
🚀 Server is running on port 3000
ดู logs ก็ติดต่อ database ได้แล้วและรันได้แล้วที่ port 3000
                                            Table "public.Word"
    Column    |              Type              | Collation | Nullable |              Default
--------------+--------------------------------+-----------+----------+------------------------------------
 id           | integer                        |           | not null | nextval('"Word_id_seq"'::regclass)
 text         | text                           |           | not null |
 meaning      | text                           |           | not null |
 example      | text                           |           |          |
 partOfSpeech | text                           |           |          |
 createdAt    | timestamp(3) without time zone |           | not null | CURRENT_TIMESTAMP
Indexes:
    "Word_pkey" PRIMARY KEY, btree (id)
เข้าไปดูใน database ก็มี table ของ backend เข้ามาแล้ว
mydb=# INSERT INTO "Word" (text, meaning, example, "partOfSpeech")
VALUES
('ephemeral', 'lasting for a very short time', 'Life is ephemeral.', 'adjective'),
('resilient', 'able to recover quickly', 'She is resilient after hardship.', 'adjective'),
('benevolent', 'well meaning and kindly', 'A benevolent old man.', 'adjective');
INSERT 0 
ลอง insert สักหน่อย
ตอนนี้ยังไปทดลอง Backend ไม่ได้ แต่ logs ไม่ error และ Database schema ก็ migration เข้ามาแล้ว
สร้าง Ingress เพื่อเข้า Service ของ Backend


Ingress ต้องมี ingress controller pod ซึ่งทำหน้าที่รับ request จากผู้ใช้ และปฏิบัติตาม Rule ที่เราสั่ง
$ minikube addons enable ingress
สร้าง pod ที่เป็น Ingress controller
$ kubectl get pods -A
NAMESPACE       NAME   
                                    READY   STATUS      RESTARTS   AGE
...

ingress-nginx   ingress-nginx-admission-create-mxbp7       0/1     Completed   0          71s
ingress-nginx   ingress-nginx-admission-patch-msd4q        0/1     Completed   0          71s
ingress-nginx   ingress-nginx-controller-9cc49f96f-ngzgw   1/1     Running     0          71s

...
ไฟล์ backend-ingress.yaml

อย่าเพิ่งรัน kubectl apply
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: backend-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
  - host: backend.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-svc
            port:
              number: 3000 # Port ของแอพ
ถ้าไม่ใช่ Linux ต้องรันคำสั่งนี้ถ้าจะใช้ Ingress ปล. เปิดอีก terminal หรือ cmd นึงนะแล้วรันค้างไว้

$ minikube tunnel

* Starting tunnel for service backend-ingress. # ถ้าเจออันนี้ถูกละ
เปิดอัก terminal หรือ cmd แล้วรัน kubectl apply เลย
คำสั่งนี้จะแมพ localhost ของคอมเราไปหา cluster
ต้องมาเซ็ต Hosts file ให้ backend.local ให้เป็น 127.0.0.1 ด้วยนะ

127.0.0.1   backend.local
ตรวจสอบ
$ kubectl get ingress
NAME              CLASS   HOSTS           ADDRESS        PORTS   AGE
backend-ingress   nginx   backend.local   192.168.58.2   80      21m
มี Ingress แล้ว
ไม่ต้องสน 192.168.58.2 นะ ถ้ารัน kubectl tunnel

ยิงด้วย Get ที่ /words
สำเร็จแล้ว!!! 😀😀😀

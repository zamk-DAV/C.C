# Firebase Storage CORS 설정 가이드

Firebase Storage에 이미지를 업로드할 때 발생하는 CORS(Cross-Origin Resource Sharing) 오류를 해결하기 위한 가이드입니다.

## 문제 원인
브라우저(Localhost 또는 Vercel 배포 사이트)에서 Firebase Storage로 직접 접근할 때, 적절한 CORS 규칙이 설정되어 있지 않으면 보안 정책상 차단됩니다.

## 해결 방법

`gsutil` 도구를 사용하여 생성된 `cors.json` 파일을 스토리지 버킷에 적용해야 합니다.

### 1단계: Google Cloud SDK 설치 (이미 설치된 경우 건너뛰기)
만약 `gsutil` 명령어가 없다면 [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)를 설치해야 합니다.

### 2단계: 로그인 및 프로젝트 설정
터미널에서 다음 명령어를 실행하여 로그인하고 프로젝트를 선택합니다.

```bash
gcloud auth login
gcloud config set project ccdear23  # 본인의 Firebase 프로젝트 ID를 확인하세요
```

### 3단계: CORS 규칙 적용
프로젝트 루트 디렉토리(`cors.json`이 있는 곳)에서 다음 명령어를 실행합니다.
버킷 이름은 Firebase Console > Storage에서 확인할 수 있습니다. (보통 `gs://<project-id>.firebasestorage.app` 형태)

사용자 로그에 있는 버킷 이름: `ccdear23.firebasestorage.app`

```bash
gsutil cors set cors.json gs://ccdear23.firebasestorage.app
```

### 4단계: 확인
설정이 적용되었는지 확인하려면 다음 명령어를 사용합니다.

```bash
gsutil cors get gs://ccdear23.firebasestorage.app
```

위 명령어를 실행한 후 몇 분 뒤에 다시 업로드를 시도해 보세요.

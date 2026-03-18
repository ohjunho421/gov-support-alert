@echo off
REM 정부지원사업 알림 파이프라인 - Windows 작업 스케줄러용
REM
REM 설정방법:
REM 1. 작업 스케줄러 열기 (taskschd.msc)
REM 2. "기본 작업 만들기" 클릭
REM 3. 트리거: "사용자가 로그온할 때" 선택
REM 4. 동작: 프로그램 시작 → 이 bat 파일 경로 지정
REM 5. "시작 위치"를 D:\gov-support-alert 로 설정
REM
REM → PC 켤 때마다 자동으로 수집+매칭+알림 실행됩니다

cd /d D:\gov-support-alert

echo [%date% %time%] 파이프라인 시작 >> scripts\pipeline.log
npx tsx scripts/collect-local.ts >> scripts\pipeline.log 2>&1
echo [%date% %time%] 파이프라인 종료 >> scripts\pipeline.log

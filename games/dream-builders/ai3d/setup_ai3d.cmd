@echo off
setlocal
title Dream Builders - installing picture-to-3D AI
echo ================================================================
echo  Dream Builders: installing the picture-to-3D AI (Hunyuan3D-2)
echo  Runs on your RTX 4060. Downloads about 10-15 GB. Keep the PC on.
echo ================================================================

rem --- 1. Git and Python 3.11 (skipped if already installed) ---
set "GIT=git"
where git >nul 2>nul || (
  if not exist "C:\Program Files\Git\cmd\git.exe" winget install -e --id Git.Git
  set "GIT=C:\Program Files\Git\cmd\git.exe"
)
set "PY=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
if not exist "%PY%" if exist "C:\Program Files\Python311\python.exe" set "PY=C:\Program Files\Python311\python.exe"
if not exist "%PY%" (
  winget install -e --id Python.Python.3.11
)
if not exist "%PY%" if exist "C:\Program Files\Python311\python.exe" set "PY=C:\Program Files\Python311\python.exe"
if not exist "%PY%" ( echo [X] Python 3.11 not found after install. Send Claude a screenshot. & pause & exit /b 1 )
echo [OK] Python: %PY%

rem --- 2. Hunyuan3D-2 code from Tencent's GitHub ---
set "ROOT=%USERPROFILE%\DreamBuilders_AI3D"
if not exist "%ROOT%" mkdir "%ROOT%"
if not exist "%ROOT%\Hunyuan3D-2\setup.py" "%GIT%" clone --depth 1 https://github.com/Tencent/Hunyuan3D-2.git "%ROOT%\Hunyuan3D-2"
if not exist "%ROOT%\Hunyuan3D-2\setup.py" ( echo [X] Download of the code failed. Send Claude a screenshot. & pause & exit /b 1 )
cd /d "%ROOT%\Hunyuan3D-2"

rem --- 3. Private Python environment + PyTorch for NVIDIA + the AI's parts ---
if not exist venv\Scripts\python.exe "%PY%" -m venv venv
set "VPY=%ROOT%\Hunyuan3D-2\venv\Scripts\python.exe"
"%VPY%" -m pip install --upgrade pip
"%VPY%" -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124
"%VPY%" -m pip install -r requirements.txt
"%VPY%" -m pip install -e .
"%VPY%" -m pip install huggingface_hub

rem --- 4. Check the graphics card works ---
"%VPY%" -c "import torch;ok=torch.cuda.is_available();print('GPU ready:',ok, torch.cuda.get_device_name(0) if ok else 'NO GPU FOUND')"

rem --- 5. Copy the car script next to it ---
copy /y "%USERPROFILE%\Downloads\DreamBuilders_models\ai3d\make3d.py" "%ROOT%\make3d.py" >nul
echo.
echo ================================================================
echo  DONE. Now double-click make3d.cmd (in DreamBuilders_models\ai3d)
echo ================================================================
pause

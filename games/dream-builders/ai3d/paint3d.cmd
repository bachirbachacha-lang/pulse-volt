@echo off
title Dream Builders - painting the 3D cars
set "ROOT=%USERPROFILE%\DreamBuilders_AI3D"
copy /y "%USERPROFILE%\Downloads\DreamBuilders_models\ai3d\paint3d.py" "%ROOT%\paint3d.py" >nul
cd /d "%ROOT%\Hunyuan3D-2"
"%ROOT%\Hunyuan3D-2\venv\Scripts\python.exe" "%ROOT%\paint3d.py" %*
echo exit code %ERRORLEVEL% >> "%USERPROFILE%\Downloads\DreamBuilders_models\ai3d\paint3d_log.txt"
pause

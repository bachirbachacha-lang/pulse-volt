@echo off
title Dream Builders - making 3D cars
set "ROOT=%USERPROFILE%\DreamBuilders_AI3D"
copy /y "%USERPROFILE%\Downloads\DreamBuilders_models\ai3d\make3d.py" "%ROOT%\make3d.py" >nul
cd /d "%ROOT%\Hunyuan3D-2"
"%ROOT%\Hunyuan3D-2\venv\Scripts\python.exe" -X faulthandler "%ROOT%\make3d.py" %*
echo exit code %ERRORLEVEL% >> "%USERPROFILE%\Downloads\DreamBuilders_models\ai3d\make3d_log.txt"
echo exit code %ERRORLEVEL%
pause

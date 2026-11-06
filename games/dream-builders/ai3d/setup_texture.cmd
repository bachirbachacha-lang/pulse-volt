@echo off
setlocal
title Dream Builders - installing the TEXTURE AI (real paint for the cars)
echo ===================================================================
echo  Installs what the texture AI needs to be built on this PC:
echo   - NVIDIA CUDA Toolkit 12.4  (about 3 GB)
echo   - Visual Studio C++ Build Tools (about 6 GB)
echo  Windows will ask "Do you want to allow..." - click YES.
echo  This takes 20-40 minutes. Keep the PC on.
echo ===================================================================
set "CUDA=C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.4"
if not exist "%CUDA%\bin\nvcc.exe" winget install -e --id Nvidia.CUDA --version 12.4
if not exist "%CUDA%\bin\nvcc.exe" ( echo [X] CUDA 12.4 did not install. Send Claude a screenshot. & pause & exit /b 1 )
set "VSB=C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if not exist "%VSB%" winget install -e --id Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
if not exist "%VSB%" ( echo [X] Build Tools did not install. Send Claude a screenshot. & pause & exit /b 1 )
call "%VSB%"
set "CUDA_HOME=%CUDA%"
set "PATH=%CUDA%\bin;%PATH%"
set DISTUTILS_USE_SDK=1
set TORCH_CUDA_ARCH_LIST=8.9
set "ROOT=%USERPROFILE%\DreamBuilders_AI3D\Hunyuan3D-2"
set "VPY=%ROOT%\venv\Scripts\python.exe"
cd /d "%ROOT%\hy3dgen\texgen\custom_rasterizer"
"%VPY%" -m pip install . --no-build-isolation
cd /d "%ROOT%\hy3dgen\texgen\differentiable_renderer"
"%VPY%" -m pip install . --no-build-isolation
cd /d "%ROOT%"
"%VPY%" -c "import custom_rasterizer_kernel, torch; print('TEXTURE AI READY:', torch.cuda.is_available())"
echo.
echo  DONE. Now double-click paint3d.cmd
pause

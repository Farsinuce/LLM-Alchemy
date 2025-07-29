@echo off
setlocal enabledelayedexpansion

:: Prompt user for search pattern
echo File Consolidator - Combines multiple files into one text file
echo.
set /p "pattern=Enter file pattern (e.g., *.txt, *.java, main.*, *.*): "

:: Ask whether to exclude media files (only for wildcard patterns)
set "excludeMedia=false"
echo.
if "%pattern%"=="*.*" (
    set /p "choice=Do you want to exclude common media files (jpg, png, mp3, etc)? [Y/N]: "
    if /I "!choice!"=="Y" set "excludeMedia=true"
) else (
    :: Check if pattern ends with .* (but not *.*)
    set "checkPattern=%pattern%"
    if "!checkPattern:~-2!"==".*" (
        set /p "choice=Do you want to exclude common media files? [Y/N]: "
        if /I "!choice!"=="Y" set "excludeMedia=true"
    )
)

:: Define media extensions to exclude
set "mediaExt=.png .jpg .jpeg .gif .ico .bmp .tiff .tif .svg .webp"
set "mediaExt=!mediaExt! .mp4 .mp3 .wav .avi .mkv .mov .flac .ogg .m4a .wma"
set "mediaExt=!mediaExt! .zip .rar .7z .tar .gz .exe .dll .bin .iso"
set "mediaExt=!mediaExt! .pdf .doc .docx .xls .xlsx .ppt .pptx"

:: Output filename
set "outputFile=combined_output.txt"

:: Remove existing output file
if exist "%outputFile%" del "%outputFile%"

:: Count files
set "fileCount=0"
set "skippedCount=0"

echo.
echo Processing files matching pattern: %pattern%
echo.

:: Process matching files
for /R %%F in (%pattern%) do (
    set "ext=%%~xF"
    set "includeFile=true"
    
    :: Skip if it's the output file itself
    if /I "%%~nxF"=="%outputFile%" set "includeFile=false"
    
    :: Check if we should exclude this file type
    if /I "!excludeMedia!"=="true" if "!includeFile!"=="true" (
        for %%M in (%mediaExt%) do (
            if /I "%%~xF"=="%%M" (
                set "includeFile=false"
                set /a skippedCount+=1
            )
        )
    )
    
    :: Add file to output
    if "!includeFile!"=="true" (
        echo Processing: %%~nxF
        echo ===== START: %%F ===== >> "%outputFile%"
        type "%%F" >> "%outputFile%" 2>nul
        echo. >> "%outputFile%"
        echo ===== END: %%F ===== >> "%outputFile%"
        echo. >> "%outputFile%"
        echo. >> "%outputFile%"
        set /a fileCount+=1
    )
)

:: Summary
echo.
echo ========================================
echo Done! Results saved to: %outputFile%
echo Files processed: !fileCount!
if !skippedCount! GTR 0 echo Files skipped (media/binary): !skippedCount!
echo ========================================
echo.
pause
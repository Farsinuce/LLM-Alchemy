@echo off
setlocal enabledelayedexpansion

:: Output filename
set "outputFile=combined_output.txt"

:: Get the full path of this batch file
set "batchFile=%~f0"

:: File to always exclude
set "excludeFile=C:\ai\LLM-Alchemy\src\components\game\LLMAlchemy.legacy.tsx"

:: Define media extensions to exclude
set "mediaExt=.png .jpg .jpeg .gif .ico .bmp .tiff .tif .svg .webp"
set "mediaExt=!mediaExt! .mp4 .mp3 .wav .avi .mkv .mov .flac .ogg .m4a .wma"
set "mediaExt=!mediaExt! .zip .rar .7z .tar .gz .exe .dll .bin .iso"
set "mediaExt=!mediaExt! .pdf .doc .docx .xls .xlsx .ppt .pptx"

:: Clear screen
cls
echo File Consolidator - Combines multiple files into one text file
echo ========================================
echo.

:: Ask for mode
echo Run default consolidation?
echo Press Y for Yes (default - all non-media files)
echo Press N for No (custom - specify extensions)
echo.
choice /C YN /N /M "Your choice [Y/N] (default=Y): " /T 5 /D Y
set "choiceResult=%ERRORLEVEL%"

:: Remove existing output file
if exist "%outputFile%" del "%outputFile%"

:: Initialize counters
set "fileCount=0"
set "skippedCount=0"

echo.
if %choiceResult%==1 (
    :: DEFAULT MODE - All non-media files
    echo Running DEFAULT consolidation (all non-media files^)...
    echo.
    
    :: Process all files
    for /R %%F in (*) do (
        set "skip=0"
        set "currentFile=%%~fF"
        set "currentFileName=%%~nxF"
        set "currentExt=%%~xF"
        
        :: Skip if it's the output file
        if /I "!currentFileName!"=="%outputFile%" set "skip=1"
        
        :: Skip if it's the batch file itself
        if /I "!currentFile!"=="%batchFile%" set "skip=1"
        
        :: Skip the specific excluded file
        if /I "!currentFile!"=="%excludeFile%" (
            set "skip=1"
            set /a skippedCount+=1
        )
        
        :: Check if it's a media file
        if !skip!==0 (
            for %%M in (%mediaExt%) do (
                if /I "!currentExt!"=="%%M" (
                    set "skip=1"
                    set /a skippedCount+=1
                )
            )
        )
        
        :: Add file to output
        if !skip!==0 (
            echo Processing: !currentFileName!
            echo ===== START: !currentFile! ===== >> "%outputFile%"
            type "!currentFile!" >> "%outputFile%" 2>nul
            echo. >> "%outputFile%"
            echo ===== END: !currentFile! ===== >> "%outputFile%"
            echo. >> "%outputFile%"
            echo. >> "%outputFile%"
            set /a fileCount+=1
        )
    )
    
) else (
    :: CUSTOM MODE - Specific extensions
    echo Enter file extensions to include (comma-separated, without dots^)
    echo Example: ts,tsx,txt,md
    set /p "extensions=Extensions: "
    
    echo.
    echo Processing files with extensions: !extensions!
    echo.
    
    :: Process each extension
    for %%E in (!extensions:,= !) do (
        for /R %%F in (*.%%E) do (
            set "skip=0"
            set "currentFile=%%~fF"
            set "currentFileName=%%~nxF"
            
            :: Skip if it's the output file
            if /I "!currentFileName!"=="%outputFile%" set "skip=1"
            
            :: Skip if it's the batch file itself
            if /I "!currentFile!"=="%batchFile%" set "skip=1"
            
            :: Skip the specific excluded file
            if /I "!currentFile!"=="%excludeFile%" (
                set "skip=1"
                set /a skippedCount+=1
            )
            
            :: Add file to output
            if !skip!==0 (
                echo Processing: !currentFileName!
                echo ===== START: !currentFile! ===== >> "%outputFile%"
                type "!currentFile!" >> "%outputFile%" 2>nul
                echo. >> "%outputFile%"
                echo ===== END: !currentFile! ===== >> "%outputFile%"
                echo. >> "%outputFile%"
                echo. >> "%outputFile%"
                set /a fileCount+=1
            )
        )
    )
)

:: Summary
echo.
echo ========================================
echo Done! Results saved to: %outputFile%
echo Files processed: !fileCount!
if !skippedCount! GTR 0 echo Files skipped: !skippedCount!
echo ========================================
echo.
pause
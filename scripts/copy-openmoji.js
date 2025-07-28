/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

function copyOpenMojiAssets() {
  // Use process.cwd() for Vercel compatibility (instead of __dirname)
  const source = path.resolve(process.cwd(), 'node_modules/openmoji/color/svg');
  const destination = path.resolve(process.cwd(), 'public/openmoji');
  
  // Check if already copied (cache check)
  const testFile = path.join(destination, '2615.svg'); // ☕ Coffee
  if (fs.existsSync(testFile)) {
    console.log('✅ OpenMoji SVGs already present, skipping copy');
    return;
  }

  try {
    // Ensure destination exists
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }
    
    // Use async copying for better performance
    const copyFile = (src, dest) => {
      return new Promise((resolve, reject) => {
        fs.copyFile(src, dest, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    };
    
    // Copy all SVG files asynchronously
    async function copyAllFiles() {
      const files = fs.readdirSync(source);
      const svgFiles = files.filter(f => f.endsWith('.svg'));
      
      console.log(`📁 Copying ${svgFiles.length} OpenMoji SVGs...`);
      
      // Batch copy to avoid overwhelming file system
      const batchSize = 100;
      for (let i = 0; i < svgFiles.length; i += batchSize) {
        const batch = svgFiles.slice(i, i + batchSize);
        await Promise.all(
          batch.map(file => 
            copyFile(
              path.join(source, file),
              path.join(destination, file)
            )
          )
        );
        
        if (i % 500 === 0) {
          console.log(`  Copied ${i}/${svgFiles.length} files...`);
        }
      }
      
      console.log('✅ OpenMoji SVGs copied to public/openmoji');
      console.log(`📁 Total files: ${svgFiles.length} SVGs`);
      console.log(`💾 Disk usage: ~50MB uncompressed, ~35MB when served with gzip`);
    }
    
    copyAllFiles().catch(error => {
      console.error('❌ Error copying OpenMoji assets:', error);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Error in copy setup:', error);
    process.exit(1);
  }
}

copyOpenMojiAssets();

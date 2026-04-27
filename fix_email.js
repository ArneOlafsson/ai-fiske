const fs = require('fs');
const path = require('path');

const extensions = ['.ts', '.tsx', '.rules'];
function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        if (file === 'node_modules' || file === '.next' || file === '.git') return;
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(file));
        } else if (extensions.some(ext => file.endsWith(ext))) {
            results.push(file);
        }
    });
    return results;
}

const files = walkDir('.');
let replacedFiles = [];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('arne@olafsson.se')) {
        // TypeScript/JavaScript files
        content = content.replace(/user\?\.email\?\.toLowerCase\(\)\.trim\(\) === 'arne@olafsson\.se'/g, 
            "(user?.email?.toLowerCase().trim() === 'arne@olafsson.se' || user?.email?.toLowerCase().trim() === 'arne.olafsson@gmail.com')");
        
        content = content.replace(/profile\?\.email\?\.toLowerCase\(\)\.trim\(\) === 'arne@olafsson\.se'/g, 
            "(profile?.email?.toLowerCase().trim() === 'arne@olafsson.se' || profile?.email?.toLowerCase().trim() === 'arne.olafsson@gmail.com')");
            
        content = content.replace(/user\?\.email === 'arne@olafsson\.se'/g, 
            "(user?.email === 'arne@olafsson.se' || user?.email === 'arne.olafsson@gmail.com')");
            
        content = content.replace(/userEmail === 'arne@olafsson\.se'/g, 
            "(userEmail === 'arne@olafsson.se' || userEmail === 'arne.olafsson@gmail.com')");
            
        // Firestore/Storage Rules
        content = content.replace(/request\.auth\.token\.email == 'arne@olafsson\.se'/g, 
            "(request.auth.token.email == 'arne@olafsson.se' || request.auth.token.email == 'arne.olafsson@gmail.com')");
            
        fs.writeFileSync(file, content, 'utf8');
        replacedFiles.push(file);
    }
});
console.log('Replaced in:', replacedFiles);

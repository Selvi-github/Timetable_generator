import fs from 'fs';
import { subjectData } from '../src/data/subjectData.js';

const updatedData = JSON.parse(JSON.stringify(subjectData));

Object.keys(updatedData).forEach(year => {
    Object.keys(updatedData[year]).forEach(sem => {
        const processList = (list) => {
            if (!list) return;
            list.forEach(sub => {
                const isHybrid = sub.name.includes('#');
                if (isHybrid) {
                    sub.academicRule.periodsPerWeek = 4;
                } else if (sub.type === 'theory') {
                    // Only update if it's currently 4 (standard load)
                    if (sub.academicRule.periodsPerWeek === 4) {
                        sub.academicRule.periodsPerWeek = 5;
                    }
                } else if (sub.type === 'lab') {
                    // Labs should be 4
                    sub.academicRule.periodsPerWeek = 4;
                }
            });
        };
        processList(updatedData[year][sem].subjects);
        processList(updatedData[year][sem].honors);
    });
});

const content = `export const subjectData = ${JSON.stringify(updatedData, null, 4)};\n`;
fs.writeFileSync('./src/data/subjectData.js', content);
console.log('subjectData.js updated with new constraints.');

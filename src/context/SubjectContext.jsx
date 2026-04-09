import React, { createContext, useContext, useState, useEffect } from 'react';
import { subjectData as initialSubjectData } from '../data/subjectData';

const SubjectContext = createContext();

export const useSubjects = () => {
    const context = useContext(SubjectContext);
    if (!context) {
        throw new Error('useSubjects must be used within a SubjectProvider');
    }
    return context;
};

export const SubjectProvider = ({ children }) => {
    const [subjects, setSubjects] = useState(null);
    const [loading, setLoading] = useState(true);

    // Initialize subjects from localStorage or fallback to static data
    useEffect(() => {
        const storedSubjects = localStorage.getItem('timetable_subjects');
        if (storedSubjects) {
            try {
                setSubjects(JSON.parse(storedSubjects));
            } catch (error) {
                console.error('Error parsing stored subjects:', error);
                setSubjects(initialSubjectData);
                localStorage.setItem('timetable_subjects', JSON.stringify(initialSubjectData));
            }
        } else {
            // First time - initialize with static data
            setSubjects(initialSubjectData);
            localStorage.setItem('timetable_subjects', JSON.stringify(initialSubjectData));
        }
        setLoading(false);
    }, []);

    // Save to localStorage whenever subjects change
    const saveSubjects = (newSubjects) => {
        setSubjects(newSubjects);
        localStorage.setItem('timetable_subjects', JSON.stringify(newSubjects));
    };

    // Add a new subject
    const addSubject = (year, semester, subject, isHonor = false) => {
        const newSubjects = { ...subjects };
        if (!newSubjects[year]) newSubjects[year] = {};
        if (!newSubjects[year][semester]) newSubjects[year][semester] = { subjects: [], honors: [] };

        const targetArray = isHonor ? 'honors' : 'subjects';
        if (!newSubjects[year][semester][targetArray]) {
            newSubjects[year][semester][targetArray] = [];
        }

        newSubjects[year][semester][targetArray].push(subject);
        saveSubjects(newSubjects);
    };

    // Update an existing subject
    const updateSubject = (year, semester, subjectCode, updatedSubject, isHonor = false) => {
        const newSubjects = { ...subjects };
        const targetArray = isHonor ? 'honors' : 'subjects';

        if (newSubjects[year]?.[semester]?.[targetArray]) {
            const index = newSubjects[year][semester][targetArray].findIndex(s => s.code === subjectCode);
            if (index !== -1) {
                newSubjects[year][semester][targetArray][index] = updatedSubject;
                saveSubjects(newSubjects);
            }
        }
    };

    // Delete a subject
    const deleteSubject = (year, semester, subjectCode) => {
        const newSubjects = { ...subjects };

        // Try to find and delete from subjects array
        if (newSubjects[year]?.[semester]?.subjects) {
            newSubjects[year][semester].subjects = newSubjects[year][semester].subjects.filter(
                s => s.code !== subjectCode
            );
        }

        // Try to find and delete from honors array
        if (newSubjects[year]?.[semester]?.honors) {
            newSubjects[year][semester].honors = newSubjects[year][semester].honors.filter(
                s => s.code !== subjectCode
            );
        }

        saveSubjects(newSubjects);
    };

    // Get all subjects for a specific year/semester
    const getSubjects = (year, semester) => {
        if (!subjects || !subjects[year] || !subjects[year][semester]) {
            return { subjects: [], honors: [] };
        }
        return {
            subjects: subjects[year][semester].subjects || [],
            honors: subjects[year][semester].honors || []
        };
    };

    // Reset to initial data
    const resetToDefault = () => {
        saveSubjects(initialSubjectData);
    };

    const value = {
        subjects,
        loading,
        addSubject,
        updateSubject,
        deleteSubject,
        getSubjects,
        resetToDefault
    };

    if (loading) {
        return <div>Loading subjects...</div>;
    }

    return (
        <SubjectContext.Provider value={value}>
            {children}
        </SubjectContext.Provider>
    );
};

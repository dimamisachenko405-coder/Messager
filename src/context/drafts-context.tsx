'use client';

import { createContext, useContext, useState, type Dispatch, type SetStateAction } from 'react';

// 1. Define the shape of the context data
interface DraftsContextType {
    drafts: { [key: string]: string };
    setDrafts: Dispatch<SetStateAction<{ [key: string]: string }>>;
}

// 2. Create the context with an initial undefined value
const DraftsContext = createContext<DraftsContextType | undefined>(undefined);

// 3. Create the provider component
// This component will wrap our chat layout, holding the state and providing it to children
export function DraftsProvider({ children }: { children: React.ReactNode }) {
    const [drafts, setDrafts] = useState<{ [key: string]: string }>({});
    return (
        <DraftsContext.Provider value={{ drafts, setDrafts }}>
            {children}
        </DraftsContext.Provider>
    );
}

// 4. Create a custom hook for easy access to the context
// This avoids having to use useContext(DraftsContext) in every component
export function useDrafts() {
    const context = useContext(DraftsContext);
    if (context === undefined) {
        // This error will be thrown if a component tries to use the context
        // outside of the provider, which helps catch bugs early.
        throw new Error('useDrafts must be used within a DraftsProvider');
    }
    return context;
}

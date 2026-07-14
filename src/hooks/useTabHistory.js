import { useEffect, useRef } from 'react';


export function useTabHistory(activeTab, setActiveTab) {
    const isPoppingRef = useRef(false);
    const primeraVezRef = useRef(true);

    
    useEffect(() => {
        window.history.replaceState({ tab: activeTab }, '');
        
    }, []);


    useEffect(() => {
        if (primeraVezRef.current) {
            primeraVezRef.current = false;
            return;
        }
        if (isPoppingRef.current) {
            isPoppingRef.current = false;
            return;
        }
        window.history.pushState({ tab: activeTab }, '');
        
    }, [activeTab]);

    
    
    useEffect(() => {
        const onPopState = (event) => {
            const tab = event.state?.tab;
            if (tab) {
                isPoppingRef.current = true;
                setActiveTab(tab);
            }
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}

import { useEffect, useRef } from 'react';

/**
 * Sincroniza una pestaña interna (activeTab) de un dashboard con el historial del navegador.
 *
 * Los dashboards (Superusuario, Director, Secretaria) manejan sus pestañas con estado local
 * de React (useState), no con rutas. Sin esto, el botón "atrás" del navegador no tiene ninguna
 * entrada de historial que consumir dentro del dashboard, así que salta directo a la pantalla
 * anterior real (el login), cerrando efectivamente la sesión visualmente.
 *
 * Con este hook, cada cambio de pestaña agrega una entrada al historial. Al presionar "atrás",
 * en vez de salir de la app, se vuelve a la pestaña anterior dentro del mismo dashboard.
 *
 * Uso:
 *   const [activeTab, setActiveTab] = useState('usuarios');
 *   useTabHistory(activeTab, setActiveTab);
 */
export function useTabHistory(activeTab, setActiveTab) {
    const isPoppingRef = useRef(false);
    const primeraVezRef = useRef(true);

    // Al montar el dashboard: esta se vuelve la "base" del historial para esta pantalla.
    // Reemplaza (no agrega) la entrada actual para no crear una entrada extra al entrar.
    useEffect(() => {
        window.history.replaceState({ tab: activeTab }, '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Cada vez que el usuario cambia de pestaña (clic en el sidebar), se agrega una entrada
    // nueva al historial, salvo que el cambio haya venido de un "atrás" (popstate) del navegador.
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    // Al presionar "atrás" (o "adelante") del navegador, mostramos la pestaña guardada en esa
    // entrada del historial en vez de dejar que el navegador navegue a la pantalla anterior real.
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

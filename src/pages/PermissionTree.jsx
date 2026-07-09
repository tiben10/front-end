import React, { useState, useMemo, useRef, useEffect } from 'react';

// Agrupacion visual por nombre de funcionalidad (el backend no maneja categoria).
// Ajusta las palabras clave si tus funcionalidades reales tienen otros nombres.
const CATEGORIAS = [
    {
        nombre: 'Seguridad',
        icono: '🛡️',
        match: (nombre) => ['usuario', 'rol', 'permiso', 'auditoria', 'parametro'].some(k => nombre.toLowerCase().includes(k))
    },
    {
        nombre: 'Académico',
        icono: '📚',
        match: (nombre) => ['alumno', 'matricula', 'aula', 'grado', 'nivel', 'anio'].some(k => nombre.toLowerCase().includes(k))
    },
    {
        nombre: 'Finanzas',
        icono: '💰',
        match: (nombre) => ['pago', 'cuota', 'concepto'].some(k => nombre.toLowerCase().includes(k))
    }
];
const CATEGORIA_OTROS = { nombre: 'Otros', icono: '📁', match: () => true };

const ACCIONES = [
    { key: 'ver', label: 'Ver' },
    { key: 'crear', label: 'Crear' },
    { key: 'editar', label: 'Editar' },
    { key: 'eliminar', label: 'Eliminar' },
    { key: 'imprimir', label: 'Exportar' }
];

function agruparPorCategoria(functionalities) {
    const grupos = {};
    functionalities.forEach(func => {
        const cat = CATEGORIAS.find(c => c.match(func.nombre || '')) || CATEGORIA_OTROS;
        if (!grupos[cat.nombre]) grupos[cat.nombre] = { icono: cat.icono, items: [] };
        grupos[cat.nombre].items.push(func);
    });
    return grupos;
}

// Checkbox controlado que soporta estado "indeterminate" de forma confiable
// (usar useRef + useEffect en vez de un ref inline evita problemas de timing).
const Checkbox = ({ checked, indeterminate = false, onChange }) => {
    const ref = useRef(null);

    useEffect(() => {
        if (ref.current) ref.current.indeterminate = indeterminate;
    }, [indeterminate]);

    return (
        <input
            ref={ref}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            style={{ width: '1rem', height: '1rem', accentColor: '#2563eb', cursor: 'pointer', flexShrink: 0 }}
        />
    );
};

const PermissionTree = ({ functionalities, permissions, onToggle }) => {
    const grupos = useMemo(() => agruparPorCategoria(functionalities), [functionalities]);
    const nombresCategorias = Object.keys(grupos);

    const [expandedCats, setExpandedCats] = useState(() => new Set(nombresCategorias));
    const [expandedFuncs, setExpandedFuncs] = useState(() => new Set(functionalities.map(f => f.idFuncionalidad)));

    const toggleCat = (nombre) => {
        setExpandedCats(prev => {
            const next = new Set(prev);
            if (next.has(nombre)) next.delete(nombre); else next.add(nombre);
            return next;
        });
    };

    const toggleFunc = (id) => {
        setExpandedFuncs(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const expandirTodos = () => {
        setExpandedCats(new Set(nombresCategorias));
        setExpandedFuncs(new Set(functionalities.map(f => f.idFuncionalidad)));
    };

    const colapsarTodos = () => {
        setExpandedCats(new Set());
        setExpandedFuncs(new Set());
    };

    // Igual que en la version Angular (permisos.component.ts): una funcionalidad esta
    // "toda marcada" cuando TODAS sus acciones (ver, crear, editar, eliminar, imprimir) estan activas.
    const isFuncAllChecked = (func) => {
        const p = permissions[func.idFuncionalidad] || {};
        return ACCIONES.every(a => !!p[a.key]);
    };

    const isFuncSomeChecked = (func) => {
        const p = permissions[func.idFuncionalidad] || {};
        return ACCIONES.some(a => !!p[a.key]);
    };

    // Checkbox de la categoria (equivalente a onParentChange en Angular):
    // activa/desactiva TODAS las acciones de TODAS las funcionalidades del grupo.
    const handleToggleCategoria = (items) => {
        const target = !items.every(f => isFuncAllChecked(f));
        items.forEach(f => {
            ACCIONES.forEach(a => {
                const actual = !!permissions[f.idFuncionalidad]?.[a.key];
                if (actual !== target) onToggle(f.idFuncionalidad, a.key);
            });
        });
    };

    // Checkbox de la funcionalidad (equivalente a onLeafChange en Angular):
    // activa/desactiva TODAS las acciones de esa funcionalidad.
    const handleToggleFuncionalidad = (func) => {
        const target = !isFuncAllChecked(func);
        ACCIONES.forEach(a => {
            const actual = !!permissions[func.idFuncionalidad]?.[a.key];
            if (actual !== target) onToggle(func.idFuncionalidad, a.key);
        });
    };

    return (
        <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <button
                    type="button"
                    className="apply-btn"
                    style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
                    onClick={expandirTodos}
                >
                    Expandir todos
                </button>
                <button
                    type="button"
                    className="apply-btn"
                    style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.8rem', background: 'white', color: '#111827', border: '1px solid #d1d5db' }}
                    onClick={colapsarTodos}
                >
                    Colapsar todos
                </button>
            </div>

            <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', maxHeight: '340px', overflowY: 'auto' }}>
                {nombresCategorias.map(nombreCat => {
                    const grupo = grupos[nombreCat];
                    const catAbierta = expandedCats.has(nombreCat);
                    const todosMarcados = grupo.items.every(f => isFuncAllChecked(f));
                    const algunoMarcado = grupo.items.some(f => isFuncSomeChecked(f));

                    return (
                        <div key={nombreCat} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: '#fafafa' }}>
                                <button
                                    type="button"
                                    onClick={() => toggleCat(nombreCat)}
                                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.7rem', color: '#9ca3af', width: '1rem', flexShrink: 0 }}
                                    aria-label={catAbierta ? 'Colapsar' : 'Expandir'}
                                >
                                    {catAbierta ? '▾' : '▸'}
                                </button>
                                <Checkbox
                                    checked={todosMarcados}
                                    indeterminate={!todosMarcados && algunoMarcado}
                                    onChange={() => handleToggleCategoria(grupo.items)}
                                />
                                <span>{grupo.icono}</span>
                                <strong
                                    style={{ fontSize: '0.9rem', color: '#111827', cursor: 'pointer' }}
                                    onClick={() => toggleCat(nombreCat)}
                                >
                                    {nombreCat}
                                </strong>
                            </div>

                            {catAbierta && grupo.items.map(func => {
                                const funcAbierta = expandedFuncs.has(func.idFuncionalidad);
                                const permsFunc = permissions[func.idFuncionalidad] || {};
                                const funcTodoMarcado = isFuncAllChecked(func);
                                const funcAlgoMarcado = isFuncSomeChecked(func);

                                return (
                                    <div key={func.idFuncionalidad}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem 0.5rem 2rem' }}>
                                            <button
                                                type="button"
                                                onClick={() => toggleFunc(func.idFuncionalidad)}
                                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.7rem', color: '#9ca3af', width: '1rem', flexShrink: 0 }}
                                                aria-label={funcAbierta ? 'Colapsar' : 'Expandir'}
                                            >
                                                {funcAbierta ? '▾' : '▸'}
                                            </button>
                                            <Checkbox
                                                checked={funcTodoMarcado}
                                                indeterminate={!funcTodoMarcado && funcAlgoMarcado}
                                                onChange={() => handleToggleFuncionalidad(func)}
                                            />
                                            <span
                                                style={{ fontSize: '0.85rem', color: '#1f2937', cursor: 'pointer' }}
                                                onClick={() => toggleFunc(func.idFuncionalidad)}
                                            >
                                                {func.nombre}
                                            </span>
                                        </div>

                                        {funcAbierta && (
                                            <div style={{ paddingLeft: '3.5rem', paddingBottom: '0.4rem' }}>
                                                {ACCIONES.map(accion => (
                                                    <label key={accion.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0', cursor: 'pointer' }}>
                                                        <Checkbox
                                                            checked={!!permsFunc[accion.key]}
                                                            onChange={() => onToggle(func.idFuncionalidad, accion.key)}
                                                        />
                                                        <span style={{ fontSize: '0.8rem', color: '#374151' }}>{accion.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PermissionTree;
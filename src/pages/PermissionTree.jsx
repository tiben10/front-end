import React from 'react';

const PermissionTree = ({ functionalities, permissions, onToggle }) => {
    return (
        <div className="checkbox-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1rem', marginBottom: '1.5rem' }}>
            {functionalities.map(func => {
                
                const isEnabled = permissions[func.idFuncionalidad]?.ver || false;
                
                return (
                    <label key={func.idFuncionalidad} className="checkbox-item" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input 
                            type="checkbox" 
                            checked={isEnabled}
                            onChange={() => onToggle(func.idFuncionalidad)}
                            style={{ width: '1rem', height: '1rem', accentColor: '#2563eb', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.875rem', color: '#1f2937' }}>{func.nombre}</span>
                    </label>
                );
            })}
        </div>
    );
};

export default PermissionTree;
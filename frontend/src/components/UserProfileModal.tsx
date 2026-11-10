import React, { useState } from 'react';
import { User, Check, Plus, X, Award, Shield, UserCheck } from 'lucide-react';
import { UserProfile } from '../types';
import { addUserProfile } from '../utils/userStorage';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  allUsers: UserProfile[];
  onSelectUser: (user: UserProfile) => void;
  onUsersUpdated: (users: UserProfile[]) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  onSelectUser,
  onUsersUpdated,
}) => {
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newHandedness, setNewHandedness] = useState<'Right' | 'Left'>('Right');
  const [newPlayStyle, setNewPlayStyle] = useState<string>('Aggressive Baseliner');
  const [newUtr, setNewUtr] = useState<string>('8.5');

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const id = `user_${newName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now().toString().slice(-4)}`;
    const newProfile: UserProfile = {
      id,
      name: newName.trim(),
      handedness: newHandedness,
      play_style: newPlayStyle,
      utr_rating: newUtr.trim() || 'Unrated',
    };

    const updatedList = addUserProfile(newProfile);
    onUsersUpdated(updatedList);
    onSelectUser(newProfile);
    setIsAdding(false);
    setNewName('');
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="liquid-glass-modal"
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'rgba(18, 22, 34, 0.94)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0a84ff, #30d158)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '14px',
              }}
            >
              <User size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#ffffff' }}>
                Local Player Profiles
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                Stored locally on this device • Per-user match tracking & biomechanics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Profiles List */}
        <div style={{ padding: '20px 24px', maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {allUsers.map((user) => {
            const isActive = user.id === currentUser.id;
            const initials = user.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <div
                key={user.id}
                onClick={() => {
                  onSelectUser(user);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '16px',
                  background: isActive ? 'rgba(48, 209, 88, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  border: isActive ? '1px solid rgba(48, 209, 88, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: isActive
                        ? 'linear-gradient(135deg, #30d158, #0a84ff)'
                        : 'rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '14px',
                    }}
                  >
                    {initials}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                        {user.name}
                      </span>
                      {isActive && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            background: '#30d158',
                            color: '#000000',
                            textTransform: 'uppercase',
                          }}
                        >
                          Active
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                      {user.handedness}-Handed • {user.play_style} • UTR {user.utr_rating}
                    </div>
                  </div>
                </div>

                {isActive && (
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#30d158',
                      color: '#000000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add User Form Section */}
        {isAdding ? (
          <form onSubmit={handleCreate} style={{ padding: '0 24px 20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <h4 style={{ margin: '16px 0 12px', fontSize: '13px', fontWeight: 700, color: '#0a84ff', textTransform: 'uppercase' }}>
              Create New Player Profile
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Player Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Carlos Alcaraz"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Dominant Hand
                  </label>
                  <select
                    value={newHandedness}
                    onChange={(e) => setNewHandedness(e.target.value as 'Right' | 'Left')}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: '#1a2233',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="Right">Right-Handed</option>
                    <option value="Left">Left-Handed</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    UTR / NTRP Rating
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9.5"
                    value={newUtr}
                    onChange={(e) => setNewUtr(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Player Style
                </label>
                <select
                  value={newPlayStyle}
                  onChange={(e) => setNewPlayStyle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: '#1a2233',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="Aggressive Baseliner">Aggressive Baseliner</option>
                  <option value="All-Court Player">All-Court Player</option>
                  <option value="Serve & Volley">Serve & Volley</option>
                  <option value="Counterpuncher">Counterpuncher</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '12px',
                    background: '#30d158',
                    color: '#000000',
                    fontWeight: 700,
                    fontSize: '14px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Save Profile
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '14px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div style={{ padding: '0 24px 20px' }}>
            <button
              onClick={() => setIsAdding(true)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px dashed rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Plus size={16} /> Add Another Local Player Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

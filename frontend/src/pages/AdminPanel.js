import { useEffect, useMemo, useState } from 'react';
import { Pencil, Shield, Trash2, UserPlus, Users } from 'lucide-react';
import API from '../utils/api';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const ROLE_OPTIONS = ['tourist', 'citizen', 'police', 'admin'];

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  dob: '',
  role: 'citizen',
  password: '',
  is_verified: true,
};

function badgeTone(role) {
  switch (role) {
    case 'admin':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'police':
      return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

export default function AdminPanel() {
  const [userName, setUserName] = useState('Admin');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get('/admin/users');
      setUsers(res.data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError(err.response?.data?.error || 'Failed to load users.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setUserName(localStorage.getItem('name') || 'Admin');
    loadUsers();
  }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const counts = useMemo(() => {
    return users.reduce(
      (acc, user) => {
        acc.total += 1;
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      },
      { total: 0, tourist: 0, citizen: 0, police: 0, admin: 0 }
    );
  }, [users]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (editingId) {
        const payload = {
          name: form.name,
          email: form.email,
          phone: form.phone,
          dob: form.dob,
          role: form.role,
          is_verified: form.is_verified,
        };
        if (form.password.trim()) payload.password = form.password;
        await API.patch(`/admin/users/${editingId}`, payload);
        setNotice('User updated successfully.');
      } else {
        await API.post('/admin/users', form);
        setNotice('User created successfully.');
      }
      resetForm();
      await loadUsers();
    } catch (err) {
      console.error('Failed to save user:', err);
      setError(err.response?.data?.error || 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (user) => {
    setEditingId(user.id);
    setForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      dob: user.dob ? String(user.dob).slice(0, 10) : '',
      role: user.role || 'citizen',
      password: '',
      is_verified: Boolean(user.is_verified),
    });
    setNotice('');
    setError('');
  };

  const handleDelete = async (user) => {
    const ok = window.confirm(`Delete user "${user.name}" (${user.email})?`);
    if (!ok) return;
    setError('');
    setNotice('');
    try {
      await API.delete(`/admin/users/${user.id}`);
      setNotice('User deleted successfully.');
      if (editingId === user.id) resetForm();
      await loadUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError(err.response?.data?.error || 'Failed to delete user.');
    }
  };

  return (
    <div className="flex h-screen bg-[#f5f7fb] relative">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="flex-1 bg-black/40" onClick={() => setIsSidebarOpen(false)} />
          <div className="w-64 bg-indigo-700 h-full">
            <Sidebar />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          userName={userName}
          onMenuToggle={() => setIsSidebarOpen((prev) => !prev)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pt-24">
          <div className="mx-auto max-w-7xl space-y-6">
            <section className="rounded-[28px] border border-white/30 bg-gradient-to-br from-indigo-700 via-indigo-600 to-sky-500 p-6 text-white shadow-2xl">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur">
                    <Shield size={16} />
                    Admin Only
                  </div>
                  <h1 className="mt-3 text-3xl font-bold">User Management</h1>
                  <p className="mt-2 max-w-2xl text-sm text-white/85">
                    Enroll new users, change roles, update profile data, and remove accounts from one place.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
                    <div className="text-xs text-white/70">Total</div>
                    <div className="text-2xl font-bold">{counts.total}</div>
                  </div>
                  <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
                    <div className="text-xs text-white/70">Tourist</div>
                    <div className="text-2xl font-bold">{counts.tourist}</div>
                  </div>
                  <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
                    <div className="text-xs text-white/70">Citizen</div>
                    <div className="text-2xl font-bold">{counts.citizen}</div>
                  </div>
                  <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
                    <div className="text-xs text-white/70">Police</div>
                    <div className="text-2xl font-bold">{counts.police}</div>
                  </div>
                  <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
                    <div className="text-xs text-white/70">Admin</div>
                    <div className="text-2xl font-bold">{counts.admin}</div>
                  </div>
                </div>
              </div>
            </section>

            {(error || notice) && (
              <div className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
                {error || notice}
              </div>
            )}

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.25fr]">
              <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-lg">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {editingId ? 'Edit User' : 'Enroll New User'}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Admins can create police/admin accounts here. Public signup cannot.
                    </p>
                  </div>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Full Name</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700">Email</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700">Phone</label>
                      <input
                        value={form.phone}
                        onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700">Date of Birth</label>
                      <input
                        type="date"
                        value={form.dob}
                        onChange={(e) => setForm((prev) => ({ ...prev, dob: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700">Role</label>
                      <select
                        value={form.role}
                        onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                      {editingId ? 'New Password (optional)' : 'Password'}
                    </label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required={!editingId}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Password must include uppercase, lowercase, number, and special character.
                    </p>
                  </div>

                  <label className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.is_verified}
                      onChange={(e) => setForm((prev) => ({ ...prev, is_verified: e.target.checked }))}
                    />
                    Mark this account as verified
                  </label>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-60"
                  >
                    <UserPlus size={18} />
                    {saving ? 'Saving...' : editingId ? 'Update User' : 'Create User'}
                  </button>
                </form>
              </div>

              <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-lg">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Existing Users</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Review accounts and change roles or profile details when needed.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
                    <Users size={16} />
                    {users.length} loaded
                  </div>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-indigo-600 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left">User</th>
                        <th className="px-4 py-3 text-left">Role</th>
                        <th className="px-4 py-3 text-left">Phone</th>
                        <th className="px-4 py-3 text-left">Verified</th>
                        <th className="px-4 py-3 text-left">Created</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                            Loading users...
                          </td>
                        </tr>
                      )}

                      {!loading && users.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                            No users found.
                          </td>
                        </tr>
                      )}

                      {!loading &&
                        users.map((user) => (
                          <tr key={user.id} className="border-b hover:bg-indigo-50/40">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-gray-900">{user.name}</div>
                              <div className="text-xs text-gray-500">{user.email}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${badgeTone(user.role)}`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-700">{user.phone || '-'}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${user.is_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {user.is_verified ? 'Verified' : 'Pending'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEdit(user)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 font-semibold text-indigo-700 hover:bg-indigo-100"
                                >
                                  <Pencil size={14} />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(user)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 font-semibold text-red-700 hover:bg-red-100"
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

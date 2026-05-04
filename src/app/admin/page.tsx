'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  LogOut,
  ArrowRight,
  Smartphone,
  Loader2,
  Users,
  Monitor,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthStore } from '@/stores';
import { useTranslation } from '@/lib/i18n';

// ======== Types ========
interface Device {
  id: string;
  user_id: string;
  device_id: string;
  device_name: string;
  is_active: boolean;
  created_at: string;
}

interface User {
  id: string;
  username: string;
  fullName: string;
  role: 'admin' | 'user';
  created_at: string;
  devices: Device[];
}

// ======== Admin Page Component ========
export default function AdminPage() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { t, dir, isRTL } = useTranslation('ar');

  // ======== State ========
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [error, setError] = useState('');

  // Expanded rows
  const [expandedUserIds, setExpandedUserIds] = useState<Set<string>>(new Set());

  // Add user dialog
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    password: '',
    fullName: '',
  });
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Add device dialog
  const [showAddDeviceDialog, setShowAddDeviceDialog] = useState(false);
  const [addDeviceUserId, setAddDeviceUserId] = useState<string | null>(null);
  const [newDeviceForm, setNewDeviceForm] = useState({
    deviceId: '',
    deviceName: '',
  });
  const [isAddingDevice, setIsAddingDevice] = useState(false);

  // Delete confirmations
  const [deleteUserTarget, setDeleteUserTarget] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const [deleteDeviceTarget, setDeleteDeviceTarget] = useState<{
    device: Device;
    userId: string;
  } | null>(null);
  const [isDeletingDevice, setIsDeletingDevice] = useState(false);

  // Toggle device loading states
  const [togglingDeviceIds, setTogglingDeviceIds] = useState<Set<string>>(new Set());

  // ======== Redirect non-admin users ========
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/');
    }
  }, [user, router]);

  // ======== Fetch users ========
  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'فشل في تحميل المستخدمين');
        return;
      }
      const data = await res.json();
      setUsers(data);
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user, fetchUsers]);

  // ======== Toggle expanded row ========
  const toggleExpand = useCallback((userId: string) => {
    setExpandedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }, []);

  // ======== Add user ========
  const handleAddUser = async () => {
    if (!newUserForm.username.trim() || !newUserForm.password.trim() || !newUserForm.fullName.trim()) {
      return;
    }
    setIsAddingUser(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUserForm.username.trim(),
          password: newUserForm.password,
          fullName: newUserForm.fullName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'فشل في إضافة المستخدم');
        return;
      }
      setShowAddUserDialog(false);
      setNewUserForm({ username: '', password: '', fullName: '' });
      await fetchUsers();
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setIsAddingUser(false);
    }
  };

  // ======== Delete user ========
  const handleDeleteUser = async () => {
    if (!deleteUserTarget) return;
    setIsDeletingUser(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/users/${deleteUserTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'فشل في حذف المستخدم');
        return;
      }
      setDeleteUserTarget(null);
      await fetchUsers();
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setIsDeletingUser(false);
    }
  };

  // ======== Add device ========
  const openAddDeviceDialog = (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (targetUser && targetUser.devices.length >= 2) return;
    setAddDeviceUserId(userId);
    setNewDeviceForm({ deviceId: '', deviceName: '' });
    setShowAddDeviceDialog(true);
  };

  const handleAddDevice = async () => {
    if (!addDeviceUserId || !newDeviceForm.deviceId.trim() || !newDeviceForm.deviceName.trim()) return;
    setIsAddingDevice(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/users/${addDeviceUserId}/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: addDeviceUserId,
          deviceId: newDeviceForm.deviceId.trim(),
          deviceName: newDeviceForm.deviceName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'فشل في إضافة الجهاز');
        return;
      }
      setShowAddDeviceDialog(false);
      setNewDeviceForm({ deviceId: '', deviceName: '' });
      await fetchUsers();
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setIsAddingDevice(false);
    }
  };

  // ======== Delete device ========
  const handleDeleteDevice = async () => {
    if (!deleteDeviceTarget) return;
    setIsDeletingDevice(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/users/${deleteDeviceTarget.userId}/devices`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: deleteDeviceTarget.device.device_id }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'فشل في حذف الجهاز');
        return;
      }
      setDeleteDeviceTarget(null);
      await fetchUsers();
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setIsDeletingDevice(false);
    }
  };

  // ======== Toggle device active status ========
  const handleToggleDevice = async (userId: string, device: Device) => {
    setTogglingDeviceIds((prev) => {
      const next = new Set(prev);
      next.add(device.device_id);
      return next;
    });
    setError('');
    try {
      const res = await fetch(`/api/admin/users/${userId}/devices`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: device.device_id, isActive: !device.is_active }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'فشل في تحديث حالة الجهاز');
        return;
      }
      await fetchUsers();
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setTogglingDeviceIds((prev) => {
        const next = new Set(prev);
        next.delete(device.device_id);
        return next;
      });
    }
  };

  // ======== Logout ========
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    clearAuth();
    router.replace('/login');
  };

  // ======== Format date ========
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ar-SY', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // ======== Truncate ID ========
  const truncateId = (id: string) => (id.length > 12 ? `${id.slice(0, 8)}...${id.slice(-4)}` : id);

  // ======== Guard: show nothing while checking role ========
  if (!user) {
    return (
      <div dir={dir} className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user.role !== 'admin') {
    return null;
  }

  // ======== Render ========
  return (
    <div dir={dir} className="min-h-screen flex flex-col bg-gray-50/80">
      {/* ======== Header / Navbar ======== */}
      <header className="sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-600 shadow-md">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-800">
                {t.adminPanel || 'إدارة المستخدمين والأجهزة'}
              </h1>
              <p className="text-xs text-gray-500 hidden sm:block">
                لوحة تحكم المشرفين — B.S Evaluation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="gap-1.5 text-sm">
              <Link href="/">
                <ArrowRight className="w-4 h-4" />
                <span className="hidden sm:inline">الرئيسية</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">خروج</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ======== Main Content ======== */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <span className="flex-1">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError('')}
              className="text-red-600 hover:text-red-800 hover:bg-red-100 h-auto px-2"
            >
              ✕
            </Button>
          </div>
        )}

        {/* Stats Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card className="py-4">
            <CardContent className="px-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{users.length}</p>
                  <p className="text-xs text-gray-500">المستخدمون</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="py-4">
            <CardContent className="px-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">
                    {users.filter((u) => u.role === 'admin').length}
                  </p>
                  <p className="text-xs text-gray-500">المشرفون</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="py-4">
            <CardContent className="px-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100">
                  <Smartphone className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">
                    {users.reduce((sum, u) => sum + u.devices.length, 0)}
                  </p>
                  <p className="text-xs text-gray-500">الأجهزة</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="py-4">
            <CardContent className="px-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100">
                  <Monitor className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">
                    {users.reduce((sum, u) => sum + u.devices.filter((d) => d.is_active).length, 0)}
                  </p>
                  <p className="text-xs text-gray-500">أجهزة نشطة</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              قائمة المستخدمين
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUsers}
                disabled={isLoadingUsers}
                className="gap-1.5"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">تحديث</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setShowAddUserDialog(true)}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة مستخدم</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {/* Loading State */}
            {isLoadingUsers && users.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mb-3" />
                <p className="text-sm">جاري تحميل المستخدمين...</p>
              </div>
            )}

            {/* Empty State */}
            {!isLoadingUsers && users.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Users className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">لا يوجد مستخدمون حالياً</p>
                <p className="text-xs mt-1">اضغط على &quot;إضافة مستخدم&quot; لإنشاء حساب جديد</p>
              </div>
            )}

            {/* Users Table */}
            {users.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                    <TableHead className="text-right font-semibold text-gray-600 px-4 py-3">
                      اسم المستخدم
                    </TableHead>
                    <TableHead className="text-right font-semibold text-gray-600 px-4 py-3 hidden sm:table-cell">
                      الاسم الكامل
                    </TableHead>
                    <TableHead className="text-center font-semibold text-gray-600 px-4 py-3">
                      الدور
                    </TableHead>
                    <TableHead className="text-center font-semibold text-gray-600 px-4 py-3">
                      الأجهزة
                    </TableHead>
                    <TableHead className="text-right font-semibold text-gray-600 px-4 py-3 hidden md:table-cell">
                      تاريخ التسجيل
                    </TableHead>
                    <TableHead className="text-center font-semibold text-gray-600 px-4 py-3">
                      الإجراءات
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const isExpanded = expandedUserIds.has(u.id);
                    const canAddDevice = u.devices.length < 2;

                    return (
                      <UserRow
                        key={u.id}
                        user={u}
                        isExpanded={isExpanded}
                        canAddDevice={canAddDevice}
                        togglingDeviceIds={togglingDeviceIds}
                        onToggleExpand={() => toggleExpand(u.id)}
                        onDelete={() => setDeleteUserTarget(u)}
                        onToggleDevice={(device) => handleToggleDevice(u.id, device)}
                        onDeleteDevice={(device) =>
                          setDeleteDeviceTarget({ device, userId: u.id })
                        }
                        onAddDevice={() => openAddDeviceDialog(u.id)}
                        formatDate={formatDate}
                        truncateId={truncateId}
                        isRTL={isRTL}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* ======== Add User Dialog ======== */}
      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-800">
              <Plus className="w-5 h-5 text-emerald-600" />
              إضافة مستخدم جديد
            </DialogTitle>
            <DialogDescription>أدخل بيانات المستخدم الجديد لإنشاء حساب</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-username" className="font-medium">
                اسم المستخدم
              </Label>
              <Input
                id="new-username"
                placeholder="مثال: engineer1"
                value={newUserForm.username}
                onChange={(e) =>
                  setNewUserForm((prev) => ({ ...prev, username: e.target.value }))
                }
                disabled={isAddingUser}
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password" className="font-medium">
                كلمة المرور
              </Label>
              <Input
                id="new-password"
                type="password"
                placeholder="4 أحرف على الأقل"
                value={newUserForm.password}
                onChange={(e) =>
                  setNewUserForm((prev) => ({ ...prev, password: e.target.value }))
                }
                disabled={isAddingUser}
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-fullname" className="font-medium">
                الاسم الكامل
              </Label>
              <Input
                id="new-fullname"
                placeholder="مثال: أحمد محمد"
                value={newUserForm.fullName}
                onChange={(e) =>
                  setNewUserForm((prev) => ({ ...prev, fullName: e.target.value }))
                }
                disabled={isAddingUser}
                className="text-right"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddUserDialog(false);
                setNewUserForm({ username: '', password: '', fullName: '' });
              }}
              disabled={isAddingUser}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={
                isAddingUser ||
                !newUserForm.username.trim() ||
                !newUserForm.password.trim() ||
                !newUserForm.fullName.trim()
              }
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isAddingUser ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الإضافة...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  إضافة المستخدم
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======== Add Device Dialog ======== */}
      <Dialog open={showAddDeviceDialog} onOpenChange={setShowAddDeviceDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-800">
              <Smartphone className="w-5 h-5 text-emerald-600" />
              إضافة جهاز جديد
            </DialogTitle>
            <DialogDescription>
              أضف جهازاً للمستخدم:{' '}
              <span className="font-semibold text-gray-700">
                {users.find((u) => u.id === addDeviceUserId)?.fullName}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="device-name" className="font-medium">
                اسم الجهاز
              </Label>
              <Input
                id="device-name"
                placeholder="مثال: جهاز المكتب"
                value={newDeviceForm.deviceName}
                onChange={(e) =>
                  setNewDeviceForm((prev) => ({ ...prev, deviceName: e.target.value }))
                }
                disabled={isAddingDevice}
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="device-id" className="font-medium">
                معرّف الجهاز (UUID)
              </Label>
              <Input
                id="device-id"
                placeholder="أدخل معرّف الجهاز الفريد"
                value={newDeviceForm.deviceId}
                onChange={(e) =>
                  setNewDeviceForm((prev) => ({ ...prev, deviceId: e.target.value }))
                }
                disabled={isAddingDevice}
                className="text-left font-mono text-sm"
                dir="ltr"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDeviceDialog(false);
                setNewDeviceForm({ deviceId: '', deviceName: '' });
              }}
              disabled={isAddingDevice}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleAddDevice}
              disabled={
                isAddingDevice ||
                !newDeviceForm.deviceId.trim() ||
                !newDeviceForm.deviceName.trim()
              }
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isAddingDevice ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الإضافة...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  إضافة الجهاز
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======== Delete User Confirmation ======== */}
      <AlertDialog open={!!deleteUserTarget} onOpenChange={(open) => !open && setDeleteUserTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              تأكيد حذف المستخدم
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 leading-relaxed">
              هل أنت متأكد من حذف المستخدم{' '}
              <span className="font-bold text-gray-800">{deleteUserTarget?.fullName}</span>
              {' '}({deleteUserTarget?.username})؟
              <br />
              سيتم حذف جميع أجهزته نهائياً ولا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isDeletingUser}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeletingUser}
              className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
            >
              {isDeletingUser ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  حذف المستخدم
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ======== Delete Device Confirmation ======== */}
      <AlertDialog
        open={!!deleteDeviceTarget}
        onOpenChange={(open) => !open && setDeleteDeviceTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              تأكيد حذف الجهاز
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 leading-relaxed">
              هل أنت متأكد من حذف الجهاز{' '}
              <span className="font-bold text-gray-800">{deleteDeviceTarget?.device.device_name}</span>؟
              <br />
              المعرّف:{' '}
              <span className="font-mono text-xs bg-gray-100 rounded px-1.5 py-0.5">
                {deleteDeviceTarget?.device.device_id.slice(0, 12)}...
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isDeletingDevice}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDevice}
              disabled={isDeletingDevice}
              className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
            >
              {isDeletingDevice ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  حذف الجهاز
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ======== User Row Component ========
interface UserRowProps {
  user: User;
  isExpanded: boolean;
  canAddDevice: boolean;
  togglingDeviceIds: Set<string>;
  onToggleExpand: () => void;
  onDelete: () => void;
  onToggleDevice: (device: Device) => void;
  onDeleteDevice: (device: Device) => void;
  onAddDevice: () => void;
  formatDate: (date: string) => string;
  truncateId: (id: string) => string;
  isRTL: boolean;
}

function UserRow({
  user,
  isExpanded,
  canAddDevice,
  togglingDeviceIds,
  onToggleExpand,
  onDelete,
  onToggleDevice,
  onDeleteDevice,
  onAddDevice,
  formatDate,
  truncateId,
}: UserRowProps) {
  return (
    <>
      <TableRow className="group">
        <TableCell className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleExpand}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors"
              aria-label={isExpanded ? 'طي' : 'توسيع'}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
            <div>
              <p className="font-medium text-gray-800">{user.username}</p>
              <p className="text-xs text-gray-500 sm:hidden">{user.fullName}</p>
            </div>
          </div>
        </TableCell>
        <TableCell className="px-4 py-3 hidden sm:table-cell text-gray-700">
          {user.fullName}
        </TableCell>
        <TableCell className="px-4 py-3 text-center">
          <Badge
            variant={user.role === 'admin' ? 'default' : 'secondary'}
            className={
              user.role === 'admin'
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          >
            {user.role === 'admin' ? 'مشرف' : 'مستخدم'}
          </Badge>
        </TableCell>
        <TableCell className="px-4 py-3 text-center">
          <Badge
            variant={user.devices.length >= 2 ? 'destructive' : 'outline'}
            className={user.devices.length >= 2 ? '' : 'text-gray-600'}
          >
            {user.devices.length} / 2
          </Badge>
        </TableCell>
        <TableCell className="px-4 py-3 text-gray-500 text-sm hidden md:table-cell">
          {formatDate(user.created_at)}
        </TableCell>
        <TableCell className="px-4 py-3">
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              disabled={user.role === 'admin'}
              title={user.role === 'admin' ? 'لا يمكن حذف مشرف' : 'حذف المستخدم'}
              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-30"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {/* Expanded Device Rows */}
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={6} className="px-0 py-0">
            <div className="bg-gray-50/60 border-y">
              <div className="max-w-4xl mx-auto py-4 px-4 sm:px-8">
                {/* Devices Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    أجهزة المستخدم — {user.fullName}
                    <Badge variant="outline" className="text-xs font-normal mr-1">
                      {user.devices.length} / 2
                    </Badge>
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onAddDevice}
                    disabled={!canAddDevice}
                    className="gap-1.5 text-xs h-7"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    إضافة جهاز
                  </Button>
                </div>

                {/* No devices */}
                {user.devices.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Smartphone className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">لا توجد أجهزة مسجلة لهذا المستخدم</p>
                  </div>
                )}

                {/* Device Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {user.devices.map((device) => {
                    const isToggling = togglingDeviceIds.has(device.device_id);

                    return (
                      <div
                        key={device.device_id}
                        className={`rounded-xl border p-4 transition-colors ${
                          device.is_active
                            ? 'bg-white border-emerald-200 shadow-sm'
                            : 'bg-gray-100/80 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Smartphone
                                className={`w-4 h-4 shrink-0 ${
                                  device.is_active ? 'text-emerald-600' : 'text-gray-400'
                                }`}
                              />
                              <p className="font-medium text-gray-800 truncate">
                                {device.device_name}
                              </p>
                            </div>
                            <p
                              className="text-xs font-mono text-gray-400 truncate"
                              dir="ltr"
                              title={device.device_id}
                            >
                              {truncateId(device.device_id)}
                            </p>
                          </div>

                          <Badge
                            variant={device.is_active ? 'default' : 'secondary'}
                            className={
                              device.is_active
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-gray-200 text-gray-500'
                            }
                          >
                            {device.is_active ? 'نشط' : 'معطّل'}
                          </Badge>
                        </div>

                        <Separator className="my-3" />

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={device.is_active}
                              onCheckedChange={() => onToggleDevice(device)}
                              disabled={isToggling}
                              aria-label="تفعيل/تعطيل الجهاز"
                            />
                            <span className="text-xs text-gray-500">
                              {isToggling ? 'جاري التحديث...' : device.is_active ? 'مفعّل' : 'معطّل'}
                            </span>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDeleteDevice(device)}
                            disabled={isToggling}
                            className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Max devices notice */}
                {user.devices.length >= 2 && (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-3 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    بلغ هذا المستخدم الحد الأقصى للأجهزة (2 أجهزة)
                  </p>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

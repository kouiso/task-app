import { Shield, User } from 'lucide-react';
import { Badge } from '@/component/ui/badge';
import { USER_ROLE, type UserRole } from '@/lib/constant/roles';

type UserRoleBadgeProps = {
  role: UserRole;
};

export const UserRoleBadge = ({ role }: UserRoleBadgeProps) => {
  if (role === USER_ROLE.ADMIN) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Shield className="h-3 w-3" /> 管理者
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      <User className="h-3 w-3" /> ユーザー
    </Badge>
  );
};

type ActiveStatusBadgeProps = {
  isActive: boolean;
};

export const ActiveStatusBadge = ({ isActive }: ActiveStatusBadgeProps) => {
  if (isActive) {
    return (
      <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-700 border-green-200">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        アクティブ
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 bg-gray-500/10 text-gray-700 border-gray-200">
      <div className="w-2 h-2 rounded-full bg-gray-500" />
      無効
    </Badge>
  );
};

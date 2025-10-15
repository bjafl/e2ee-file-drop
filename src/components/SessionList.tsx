import { type FC, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SessionItem } from './SessionItem';
import type { SessionInfo, SessionStatus } from '@/types/api';
import { useTranslation } from 'react-i18next';

interface SessionListProps {
  sessions: Array<SessionInfo>;
  title?: string;
  showFilters?: boolean;
  onDeleteSessionClick?: (sessionId: string) => void;
}

export const SessionList: FC<SessionListProps> = ({
  sessions,
  title = 'Sessions Overview',
  showFilters = true,
  onDeleteSessionClick = () => {},
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SessionStatus | 'all'>(
    'all'
  );

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const matchesSearch =
        session.sessionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.senderPublicKey
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        session.fileName?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || session.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [sessions, searchQuery, statusFilter]);

  const statusCounts = useMemo(() => {
    return sessions.reduce(
      (acc, session) => {
        acc[session.status] = (acc[session.status] || 0) + 1;
        return acc;
      },
      {} as Record<SessionStatus, number>
    );
  }, [sessions]);

  return (
    <div className="w-full space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{title}</h1>
        <p className="text-slate-600">
          {filteredSessions.length} {t('of')} {sessions.length} {t('sessionPlural')}
        </p>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Session ID, File Name or Public Key..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="w-full md:w-48">
                <Select
                  value={statusFilter}
                  onValueChange={(value) =>
                    setStatusFilter(value as SessionStatus | 'all')
                  }
                >
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all')} ({sessions.length})</SelectItem>
                    <SelectItem value="waiting">
                      {t('status.waiting')} ({statusCounts.waiting || 0})
                    </SelectItem>
                    <SelectItem value="uploading">
                      {t('status.uploading')} ({statusCounts.uploading || 0})
                    </SelectItem>
                    <SelectItem value="uploaded">
                      {t('status.uploaded')} ({statusCounts.uploaded || 0})
                    </SelectItem>
                    <SelectItem value="downloaded">
                      {t('status.downloaded')} ({statusCounts.downloaded || 0})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredSessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t('status.noSessions')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSessions.map((session) => (
            <SessionItem key={session.sessionId} {...session} onDelete={() => onDeleteSessionClick(session.sessionId)} />
          ))}
        </div>
      )}
    </div>
  );
};

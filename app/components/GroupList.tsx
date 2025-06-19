'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import classNames from 'classnames/bind';
import { useInView } from 'react-intersection-observer';
import { Group } from '@/types/entities';
import { PaginationQuery } from '@/types/pagination';
import { LinkButton } from '@/lib/components/Button';
import Dropdown from '@/lib/components/Dropdown';
import Input from '@/lib/components/Input';
import { DEFAULT_GROUPS_PAGINATION_QUERY } from '@/lib/api';
import GroupListItem from './GroupListItem';
import { getGroupsAction } from '../actions';
import styles from './GroupList.module.css';

const cx = classNames.bind(styles);

const GroupListHeader = ({
  query: initialQuery = DEFAULT_GROUPS_PAGINATION_QUERY,
}: {
  query: PaginationQuery;
}) => {
  const router = useRouter();
  const [query, setQuery] = useState<PaginationQuery>(initialQuery);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const search = formData.get('search') as string;
    setQuery((prev) => ({
      ...prev,
      search,
    }));
  };

  useEffect(() => {
    const urlSearchParams = new URLSearchParams(
      Object.entries(query).filter(([, value]) => value !== '')
    );
    router.push(`?${urlSearchParams.toString()}`);
  }, [router, query]);

  return (
    <div className={cx('listHeader')}>
      <h2 className={cx('title')}>진행 중인 그룹</h2>
      <div className={cx('actions')}>
        <form onSubmit={handleSubmit}>
          <Input
            className={cx('search')}
            name="search"
            id="search"
            search
            placeholder="이름으로 검색하기"
          />
        </form>

        <Dropdown
          className={cx('orderBy')}
          value={query.orderBy}
          onChange={(value) =>
            setQuery((prev) => ({ ...prev, orderBy: value }))
          }
          options={[
            { label: '최신순', value: 'createdAt' },
            { label: '참여자 수', value: 'participantCount' },
            { label: '좋아요 수', value: 'likeCount' },
          ]}
        />
        <LinkButton appearance="minimal" href="/groups/new">
          + 새 그룹 만들기
        </LinkButton>
      </div>
    </div>
  );
};

const GroupList = ({
  initialValues = [],
  paginationQuery,
  total,
}: {
  initialValues: Group[];
  paginationQuery: PaginationQuery;
  total: number;
}) => {
  const [groups, setGroups] = useState<Group[]>(initialValues);
  const [page, setPage] = useState(paginationQuery?.page ?? 1);
  const [groupIds, setGroupIds] = useState<Set<number>>(new Set(initialValues.map(g => g.id)));
  const { ref, inView } = useInView({ threshold: 0.1 });
  const [hasNext, setHasNext] = useState(groups.length < total);

  const loadMore = useCallback(async () => {
    const { data: next } = await getGroupsAction({
      ...paginationQuery,
      page: page + 1,
    });

    const filtered = next.filter(g => !groupIds.has(g.id));

    if (filtered.length === 0) {
      setHasNext(false); // 더 이상 가져올 게 없음
      return;
    }

    setGroups(prev => [...prev, ...filtered]);
    setGroupIds(prev => {
      const newSet = new Set(prev);
      filtered.forEach(g => newSet.add(g.id));
      return newSet;
    });
    setPage(prev => prev + 1);
  }, [paginationQuery, page, groupIds]);

  useEffect(() => {
    if (inView && hasNext) {
      loadMore();
    }
  }, [inView, hasNext, loadMore]);

  useEffect(() => {
    setGroups(initialValues);
    setGroupIds(new Set(initialValues.map(g => g.id)));
    setPage(paginationQuery?.page ?? 1);
    setHasNext(initialValues.length < total);
  }, [initialValues, paginationQuery, total]);

  return (
    <div className={cx('container')}>
      <GroupListHeader query={paginationQuery} />
      <ul className={cx('list')}>
        {groups.map((group) => (
          <li key={group.id}>
            <GroupListItem group={group} />
          </li>
        ))}
      </ul>
      {hasNext && <div ref={ref} />}
    </div>
  );
};

export default GroupList;

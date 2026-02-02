// src/app/profile/page.tsx
'use client'

import { Card, Form, Input, Button, Avatar, Typography, Space, Statistic, Row, Col, message } from 'antd'
import { UserOutlined, LogoutOutlined, FileTextOutlined, HistoryOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import type { GetUserInformationResponse } from '@/app/type/api'
import { useUpdateUserBasicInfo } from '@/hooks/useUser'
import { useInfiniteContracts } from '@/hooks/useContracts'
import { useInfiniteHistory } from '@/hooks/useHistory'
import { useMemo } from 'react'

const { Title, Text } = Typography

async function fetchUserInfo(): Promise<GetUserInformationResponse> {
  const response = await fetch('/api/user/getUserInformation')
  if (!response.ok) {
    throw new Error('Failed to fetch user information')
  }
  return response.json()
}

export default function ProfilePage() {
  const [form] = Form.useForm()
  const { signOut } = useClerk()
  const router = useRouter()
  const updateUserInfo = useUpdateUserBasicInfo()

  const { data: userInfo, refetch } = useQuery({
    queryKey: ['userInfo'],
    queryFn: fetchUserInfo
  })

  const { data: contractsData } = useInfiniteContracts(100)
  const { data: historyData } = useInfiniteHistory(100)

  // Calculate stats
  const stats = useMemo(() => {
    const allContracts = contractsData?.pages.flatMap(page => 
      'contracts' in page ? page.contracts : []
    ) || []
    
    const allHistory = historyData?.pages.flatMap(page =>
      'history' in page ? page.history : []
    ) || []

    return {
      totalContracts: allContracts.length,
      activeContracts: allContracts.filter(c => c.status === 'ACTIVE').length,
      completedSessions: allHistory.filter(h => h.status === 'PT_CHECKED_IN').length,
      totalSessions: allHistory.length
    }
  }, [contractsData, historyData])

  const handleSubmit = async (values: { first_name?: string; last_name?: string }) => {
    try {
      await updateUserInfo.mutateAsync(values)
      message.success('Profile updated successfully')
      refetch()
    } catch (error: any) {
      message.error(error.message || 'Failed to update profile')
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/sign-in')
  }

  if (!userInfo || 'error' in userInfo) {
    return null
  }

  const fullName = [userInfo.first_name, userInfo.last_name].filter(Boolean).join(' ') || userInfo.username || 'User'

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Profile Header */}
      <Card>
        <div className="flex flex-col items-center text-center">
          <Avatar
            size={100}
            src={userInfo.imageUrl}
            icon={<UserOutlined />}
            className="mb-4"
          />
          <Title level={3} className="mb-1">{fullName}</Title>
          <Text type="secondary">{userInfo.emailAddresses?.[0]?.emailAddress}</Text>
          <Text type="secondary" className="mt-2">Role: {userInfo.role}</Text>
        </div>
      </Card>

      {/* Stats */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Contracts"
              value={stats.totalContracts}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Active Contracts"
              value={stats.activeContracts}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#FA6868' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Sessions"
              value={stats.totalSessions}
              prefix={<HistoryOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Completed"
              value={stats.completedSessions}
              prefix={<HistoryOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Edit Profile */}
      <Card title="Edit Profile">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            first_name: userInfo.first_name || '',
            last_name: userInfo.last_name || ''
          }}
        >
          <Form.Item
            name="first_name"
            label="First Name"
          >
            <Input placeholder="Enter first name" />
          </Form.Item>

          <Form.Item
            name="last_name"
            label="Last Name"
          >
            <Input placeholder="Enter last name" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={updateUserInfo.isPending}
              block
            >
              Update Profile
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Logout */}
      <Card>
        <Button
          danger
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          block
          size="large"
        >
          Logout
        </Button>
      </Card>
    </div>
  )
}


// src/app/profile/page.tsx
'use client'

import { Card, Form, Input, Button, Avatar, Typography, Space, Statistic, Row, Col, message, Divider } from 'antd'
import { UserOutlined, LogoutOutlined, FileTextOutlined, HistoryOutlined, EditOutlined, CheckCircleOutlined, TrophyOutlined, FireOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import type { GetUserInformationResponse } from '@/app/type/api'
import { useUpdateUserBasicInfo } from '@/hooks/useUser'
import { useInfiniteContracts } from '@/hooks/useContracts'
import { useInfiniteHistory } from '@/hooks/useHistory'
import { useMemo, useState } from 'react'
import packageJson from '../../../../package.json'

const { Title, Text, Paragraph } = Typography

async function fetchUserInfo(): Promise<GetUserInformationResponse> {
  const response = await fetch('/api/user/getUserInformation')
  if (!response.ok) {
    throw new Error('Failed to fetch user information')
  }
  return response.json()
}

export default function ProfilePage() {
  const [form] = Form.useForm()
  const [isEditing, setIsEditing] = useState(false)
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
      totalSessions: allHistory.length,
      upcomingSessions: allHistory.filter(h => {
        const sessionTime = h.date + (h.from * 60 * 1000)
        return sessionTime >= Date.now() && h.status !== 'CANCELED' && h.status !== 'EXPIRED'
      }).length
    }
  }, [contractsData, historyData])

  const handleSubmit = async (values: { first_name?: string; last_name?: string }) => {
    try {
      await updateUserInfo.mutateAsync(values)
      message.success('Profile updated successfully')
      setIsEditing(false)
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

  // Role badge styling
  const getRoleBadge = () => {
    const roleStyles = {
      ADMIN: { bg: 'from-red-500 to-pink-500', label: 'Admin', icon: '👑' },
      STAFF: { bg: 'from-blue-500 to-cyan-500', label: 'Staff', icon: '⚡' },
      CUSTOMER: { bg: 'from-green-500 to-emerald-500', label: 'Member', icon: '💪' }
    }
    return roleStyles[userInfo.role as keyof typeof roleStyles] || roleStyles.CUSTOMER
  }

  const roleBadge = getRoleBadge()

  return (
    <div className="pb-6">
      {/* Profile Hero Card */}
      <div className="relative mb-5 overflow-hidden">
        <div className={`bg-gradient-to-br ${roleBadge.bg} px-6 py-8 pb-24`}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16" />
        </div>

        <div className="relative -mt-20 px-4">
          <Card className="!border-0 shadow-xl">
            <div className="flex flex-col items-center text-center py-2">
              <div className="relative mb-5">
                <Avatar
                  size={110}
                  src={userInfo.imageUrl}
                  icon={<UserOutlined />}
                  className="border-4 border-white shadow-lg"
                />
                <div className="absolute bottom-1 right-1 w-9 h-9 bg-green-400 border-4 border-white rounded-full" />
              </div>

              <Title level={3} className="!mb-2">{fullName}</Title>
              <Text type="secondary" className="text-sm mb-3">{userInfo.emailAddresses?.[0]?.emailAddress}</Text>

              <div className={`px-5 py-2 bg-gradient-to-r ${roleBadge.bg} rounded-full flex items-center gap-2`}>
                <span className="text-xl">{roleBadge.icon}</span>
                <Text className="text-white font-semibold text-base">{roleBadge.label}</Text>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-5 px-4">
        <Title level={5} className="!mb-3">Your Progress</Title>
        <div className="grid grid-cols-2 gap-3">
          <Card className="!border-0 shadow-sm" styles={{ body: { padding: '20px' } }}>
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-[#FA6868] to-[#fc8585] rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                <FileTextOutlined className="text-white text-2xl" />
              </div>
              <Text strong className="text-3xl block mb-1">{stats.activeContracts}</Text>
              <Text className="text-gray-500 text-xs">Active Contracts</Text>
            </div>
          </Card>

          <Card className="!border-0 shadow-sm" styles={{ body: { padding: '20px' } }}>
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-[#10b981] to-[#34d399] rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                <CheckCircleOutlined className="text-white text-2xl" />
              </div>
              <Text strong className="text-3xl block mb-1">{stats.completedSessions}</Text>
              <Text className="text-gray-500 text-xs">Completed</Text>
            </div>
          </Card>

          <Card className="!border-0 shadow-sm" styles={{ body: { padding: '20px' } }}>
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-[#5A9CB5] to-[#6BADC5] rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                <HistoryOutlined className="text-white text-2xl" />
              </div>
              <Text strong className="text-3xl block mb-1">{stats.upcomingSessions}</Text>
              <Text className="text-gray-500 text-xs">Upcoming</Text>
            </div>
          </Card>

          <Card className="!border-0 shadow-sm" styles={{ body: { padding: '20px' } }}>
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-[#FAAC68] to-[#fbc185] rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                <TrophyOutlined className="text-white text-2xl" />
              </div>
              <Text strong className="text-3xl block mb-1">{stats.totalSessions}</Text>
              <Text className="text-gray-500 text-xs">Total Sessions</Text>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Profile */}
      <div className="mb-5 px-4">
        <Card
          className="!border-0 shadow-sm"
          title={
            <div className="flex items-center justify-between py-1">
              <span className="font-semibold">Personal Information</span>
              {!isEditing && (
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => setIsEditing(true)}
                  size="middle"
                >
                  Edit
                </Button>
              )}
            </div>
          }
        >
          {isEditing ? (
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
                label={<Text strong>First Name</Text>}
              >
                <Input placeholder="Enter first name" size="large" />
              </Form.Item>

              <Form.Item
                name="last_name"
                label={<Text strong>Last Name</Text>}
              >
                <Input placeholder="Enter last name" size="large" />
              </Form.Item>

              <Form.Item className="!mb-0">
                <Space className="w-full" size="middle" direction="vertical">
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={updateUserInfo.isPending}
                    block
                    size="large"
                    className="h-12"
                  >
                    Save Changes
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditing(false)
                      form.resetFields()
                    }}
                    block
                    size="large"
                    className="h-12"
                  >
                    Cancel
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          ) : (
            <div className="py-2">
              <div className="mb-5">
                <Text className="text-gray-500 text-xs block mb-2">First Name</Text>
                <Text strong className="text-base">{userInfo.first_name || 'Not set'}</Text>
              </div>
              <Divider className="!my-4" />
              <div>
                <Text className="text-gray-500 text-xs block mb-2">Last Name</Text>
                <Text strong className="text-base">{userInfo.last_name || 'Not set'}</Text>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Logout Button */}
      <div className="px-4">
        <Button
          danger
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          block
          size="large"
          className="h-14 text-base font-semibold"
        >
          Logout
        </Button>
      </div>

      {/* Version Information */}
      <div className="px-4 mt-6 pb-4">
        <div className="text-center">
          <Text className="text-gray-400 text-xs block mb-1">GoChul Fitness</Text>
          <Text className="text-gray-500 text-xs">Version {packageJson.version}</Text>
        </div>
      </div>
    </div>
  )
}


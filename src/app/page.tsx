import { Button, Card, Space, Tag, Alert } from 'antd'

const Home = () => (
  <div className='min-h-screen bg-gray-50 p-8'>
    <div className='max-w-6xl mx-auto space-y-8'>
      {/* Header */}
      <div className='text-center mb-12'>
        <h1 className='text-4xl font-bold text-primary mb-2'>GoChul Fitness</h1>
        <p className='text-gray-600'>Theme Color Showcase</p>
      </div>

      {/* Ant Design Components */}
      <Card title='Ant Design Components' className='shadow-md'>
        <Space orientation='vertical' size='large' className='w-full'>
          <div>
            <h3 className='text-lg font-semibold mb-4'>Buttons</h3>
            <Space wrap>
              <Button type='primary'>Primary Button</Button>
              <Button type='default'>Default Button</Button>
              <Button type='dashed'>Dashed Button</Button>
              <Button type='link'>Link Button</Button>
              <Button danger>Danger Button</Button>
            </Space>
          </div>

          <div>
            <h3 className='text-lg font-semibold mb-4'>Tags</h3>
            <Space wrap>
              <Tag color='#FA6868'>Primary Tag</Tag>
              <Tag color='#FAAC68'>Secondary Tag</Tag>
              <Tag color='#5A9CB5'>Accent Tag</Tag>
              <Tag color='#FACE68'>Warning Tag</Tag>
            </Space>
          </div>

          <div>
            <h3 className='text-lg font-semibold mb-4'>Alerts</h3>
            <Space orientation='vertical' className='w-full'>
              <Alert title='Success message' type='success' showIcon />
              <Alert title='Info message' type='info' showIcon />
              <Alert title='Warning message' type='warning' showIcon />
              <Alert title='Error message' type='error' showIcon />
            </Space>
          </div>
        </Space>
      </Card>

      {/* Tailwind Colors */}
      <Card title='Tailwind Color Palette' className='shadow-md'>
        <div className='space-y-6'>
          {/* Primary */}
          <div>
            <h3 className='text-lg font-semibold mb-3'>Primary (#FA6868)</h3>
            <div className='flex gap-2 flex-wrap'>
              <div className='text-center'>
                <div className='w-20 h-20 bg-primary-50 rounded-lg shadow-sm' />
                <p className='text-xs mt-1'>50</p>
              </div>
              <div className='text-center'>
                <div className='w-20 h-20 bg-primary-100 rounded-lg shadow-sm' />
                <p className='text-xs mt-1'>100</p>
              </div>
              <div className='text-center'>
                <div className='w-20 h-20 bg-primary-300 rounded-lg shadow-sm' />
                <p className='text-xs mt-1'>300</p>
              </div>
              <div className='text-center'>
                <div className='w-20 h-20 bg-primary rounded-lg shadow-md' />
                <p className='text-xs mt-1 font-semibold'>500</p>
              </div>
              <div className='text-center'>
                <div className='w-20 h-20 bg-primary-700 rounded-lg shadow-sm' />
                <p className='text-xs mt-1'>700</p>
              </div>
              <div className='text-center'>
                <div className='w-20 h-20 bg-primary-900 rounded-lg shadow-sm' />
                <p className='text-xs mt-1'>900</p>
              </div>
            </div>
          </div>

          {/* Secondary */}
          <div>
            <h3 className='text-lg font-semibold mb-3'>Secondary (#FAAC68)</h3>
            <div className='flex gap-2 flex-wrap'>
              <div className='text-center'>
                <div className='w-20 h-20 bg-secondary-50 rounded-lg shadow-sm' />
                <p className='text-xs mt-1'>50</p>
              </div>
              <div className='text-center'>
                <div className='w-20 h-20 bg-secondary-100 rounded-lg shadow-sm' />
                <p className='text-xs mt-1'>100</p>
              </div>
              <div className='text-center'>
                <div className='w-20 h-20 bg-secondary-300 rounded-lg shadow-sm' />
                <p className='text-xs mt-1'>300</p>
              </div>
              <div className='text-center'>
                <div className='w-20 h-20 bg-secondary rounded-lg shadow-md' />
                <p className='text-xs mt-1 font-semibold'>500</p>
              </div>
              <div className='text-center'>
                <div className='w-20 h-20 bg-secondary-700 rounded-lg shadow-sm' />
                <p className='text-xs mt-1'>700</p>
              </div>
              <div className='text-center'>
                <div className='w-20 h-20 bg-secondary-900 rounded-lg shadow-sm' />
                <p className='text-xs mt-1'>900</p>
              </div>
            </div>
          </div>

          {/* Accent */}
          <div>
            <h3 className='text-lg font-semibold mb-3'>Accent (#5A9CB5)</h3>
            <div className='flex gap-2 flex-wrap'>
              <div className='text-center'>
                <div className='w-20 h-20 bg-accent-50 rounded-lg shadow-sm' />
                <p className='text-xs mt-1'>50</p>
              </div>
              <div className='text-center'>
                <div className='w-20 h-20 bg-accent-100 rounded-lg shadow-sm' />
                <p className='text-xs mt-1'>100</p>
              </div>
              <div className='text-center'>
                <div className='w-20 h-20 bg-accent-300 rounded-lg shadow-sm' />
                <p className='text-xs mt-1'>300</p>
              </div>
              <div className='text-center'>
                <div className='w-20 h-20 bg-accent rounded-lg shadow-md' />
                <p className='text-xs mt-1 font-semibold'>500</p>
              </div>
              <div className='text-center'>
                <div className='w-20 h-20 bg-accent-700 rounded-lg shadow-sm' />
                <p className='text-xs mt-1'>700</p>
              </div>
              <div className='text-center'>
                <div className='w-20 h-20 bg-accent-900 rounded-lg shadow-sm' />
                <p className='text-xs mt-1'>900</p>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div>
            <h3 className='text-lg font-semibold mb-3'>Warning (#FACE68)</h3>
            <div className='flex gap-2 flex-wrap'>
              <div className='text-center'>
                <div className='w-20 h-20 bg-warning-50 rounded-lg shadow-sm' />
                <p className='text-xs mt-1'>50</p>
              </div>
              <div className='text-center'>
                <div className='w-20 h-20 bg-warning-100 rounded-lg shadow-sm' />
                <p className='text-xs mt-1'>100</p>
              </div>
              <div className='text-center'>
                <div className='w-20 h-20 bg-warning-300 rounded-lg shadow-sm' />
                <p className='text-xs mt-1'>300</p>
              </div>
              <div className='text-center'>
                <div className='w-20 h-20 bg-warning rounded-lg shadow-md' />
                <p className='text-xs mt-1 font-semibold'>500</p>
              </div>
              <div className='text-center'>
                <div className='w-20 h-20 bg-warning-700 rounded-lg shadow-sm' />
                <p className='text-xs mt-1'>700</p>
              </div>
              <div className='text-center'>
                <div className='w-20 h-20 bg-warning-900 rounded-lg shadow-sm' />
                <p className='text-xs mt-1'>900</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Usage Examples */}
      <Card title='Usage Examples' className='shadow-md'>
        <div className='space-y-4'>
          <div className='p-4 bg-primary-50 border-l-4 border-primary rounded'>
            <h4 className='text-primary font-semibold'>Primary Color Usage</h4>
            <p className='text-gray-700 mt-1'>
              Use for main CTAs, primary actions, and brand emphasis.
            </p>
          </div>
          <div className='p-4 bg-secondary-50 border-l-4 border-secondary rounded'>
            <h4 className='text-secondary-700 font-semibold'>
              Secondary Color Usage
            </h4>
            <p className='text-gray-700 mt-1'>
              Use for secondary actions, warm highlights, and complementary
              elements.
            </p>
          </div>
          <div className='p-4 bg-accent-50 border-l-4 border-accent rounded'>
            <h4 className='text-accent-700 font-semibold'>
              Accent Color Usage
            </h4>
            <p className='text-gray-700 mt-1'>
              Use for links, informational elements, and cool contrast.
            </p>
          </div>
          <div className='p-4 bg-warning-50 border-l-4 border-warning rounded'>
            <h4 className='text-warning-700 font-semibold'>
              Warning Color Usage
            </h4>
            <p className='text-gray-700 mt-1'>
              Use for warnings, alerts, and important highlights.
            </p>
          </div>
        </div>
      </Card>
    </div>
  </div>
)

export default Home

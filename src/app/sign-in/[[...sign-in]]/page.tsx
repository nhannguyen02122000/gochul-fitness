import { SignIn } from '@clerk/nextjs'
import Image from 'next/image'

export default function Page() {
  return (
    <div className='w-screen h-screen relative'>
      <div className='w-full h-full absolute bg-red-300'>
        <Image
          src={'/images/login_background.jpg'}
          fill
          alt='background'
          objectFit={'cover'}
          objectPosition={'right bottom'}
          className='blur-md'
        />
      </div>
      <div className='w-full h-full flex items-center justify-center grow'>
        <SignIn
          appearance={{
            elements: {
              formButtonPrimary:
                '!bg-red-500 !hover:bg-red-400 !border-none !shadow-none'
            }
          }}
          fallback={'/'}
          fallbackRedirectUrl={'/'}
        />
      </div>
    </div>
  )
}

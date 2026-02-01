# React Query Setup & Usage Guide

This document explains how to use React Query (TanStack Query) in this project for client-side data fetching and state management.

## 📦 Installation

React Query has been installed with the following packages:
- `@tanstack/react-query` - Core library
- `@tanstack/react-query-devtools` - Development tools for debugging

## 🔧 Setup

### 1. Provider Configuration

The `ReactQueryProvider` is configured in `src/providers/QueryClientProvider.tsx` with the following default options:

```typescript
{
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,        // Data stays fresh for 1 minute
      refetchOnWindowFocus: false   // Don't refetch when window regains focus
    }
  }
}
```

### 2. Layout Integration

The provider is integrated in `src/app/layout.tsx` and wraps all components:

```tsx
<ReactQueryProvider>
  <AntConfigProvider>{children}</AntConfigProvider>
</ReactQueryProvider>
```

## 🎣 Custom Hooks

### Contract Hooks (`src/hooks/useContracts.ts`)

#### 1. **useContracts** - Fetch contracts with standard pagination

```typescript
const { data, isLoading, error, refetch } = useContracts(page, limit)
```

**Example:**
```tsx
function ContractList() {
  const { data, isLoading, error } = useContracts(1, 10)
  
  if (isLoading) return <Spin />
  if (error) return <div>Error: {error.message}</div>
  
  return <div>{data.contracts.map(contract => ...)}</div>
}
```

#### 1b. **useInfiniteContracts** - Fetch contracts with infinite scrolling

```typescript
const { 
  data, 
  isLoading, 
  error, 
  fetchNextPage, 
  hasNextPage, 
  isFetchingNextPage 
} = useInfiniteContracts(limit)
```

**Example (Manual Load More):**
```tsx
function InfiniteContractList() {
  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useInfiniteContracts(10)
  
  // Flatten all contracts from all pages
  const allContracts = data?.pages.flatMap(page => page.contracts) ?? []
  
  if (isLoading) return <Spin />
  
  return (
    <div>
      {allContracts.map(contract => (
        <div key={contract.id}>{contract.kind}</div>
      ))}
      
      <Button 
        onClick={() => fetchNextPage()} 
        disabled={!hasNextPage || isFetchingNextPage}
      >
        {isFetchingNextPage ? 'Loading...' : 'Load More'}
      </Button>
    </div>
  )
}
```

**Example (Auto-scroll):**
```tsx
function AutoScrollContractList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = 
    useInfiniteContracts(10)
  
  const observerTarget = useRef<HTMLDivElement>(null)
  
  // Auto-load on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )
    
    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }
    
    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current)
      }
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])
  
  const allContracts = data?.pages.flatMap(page => page.contracts) ?? []
  
  return (
    <div>
      {allContracts.map(contract => <div key={contract.id}>...</div>)}
      <div ref={observerTarget} />
    </div>
  )
}
```

#### 2. **useCreateContract** - Create a new contract

```typescript
const { mutate, isPending, isSuccess, isError } = useCreateContract()
```

**Example:**
```tsx
function CreateContractButton() {
  const { mutate, isPending } = useCreateContract()
  
  const handleCreate = () => {
    mutate(
      {
        kind: 'PT',
        status: 'ACTIVE',
        money: 5000
      },
      {
        onSuccess: (data) => {
          message.success('Contract created!')
          console.log('Created:', data.contract)
        },
        onError: (error) => {
          message.error(error.message)
        }
      }
    )
  }
  
  return (
    <Button onClick={handleCreate} loading={isPending}>
      Create Contract
    </Button>
  )
}
```

#### 3. **useUpdateContract** - Update an existing contract

```typescript
const { mutate, isPending } = useUpdateContract()
```

**Example:**
```tsx
function UpdateContractButton({ contractId }: { contractId: string }) {
  const { mutate, isPending } = useUpdateContract()
  
  const handleUpdate = () => {
    mutate(
      {
        contract_id: contractId,
        status: 'COMPLETED',
        money: 6000
      },
      {
        onSuccess: () => {
          message.success('Contract updated!')
        }
      }
    )
  }
  
  return (
    <Button onClick={handleUpdate} loading={isPending}>
      Update
    </Button>
  )
}
```

#### 4. **useDeleteContract** - Delete a contract

```typescript
const { mutate, isPending } = useDeleteContract()
```

**Example:**
```tsx
function DeleteContractButton({ contractId }: { contractId: string }) {
  const { mutate, isPending } = useDeleteContract()
  
  const handleDelete = () => {
    mutate(
      { contract_id: contractId },
      {
        onSuccess: () => {
          message.success('Contract deleted!')
        }
      }
    )
  }
  
  return (
    <Button danger onClick={handleDelete} loading={isPending}>
      Delete
    </Button>
  )
}
```

## 🔑 Query Keys

Query keys are organized in `contractKeys` for easy cache management:

```typescript
contractKeys = {
  all: ['contracts'],
  lists: () => ['contracts', 'list'],
  list: (page, limit) => ['contracts', 'list', { page, limit }],
  details: () => ['contracts', 'detail'],
  detail: (id) => ['contracts', 'detail', id]
}
```

## 🎯 Example Component

See `src/components/examples/ContractExample.tsx` for a complete working example that demonstrates:
- Fetching contracts with pagination
- Creating new contracts
- Updating existing contracts
- Deleting contracts
- Loading states
- Error handling
- Success messages

## 🔄 Cache Invalidation

After mutations (create, update, delete), the hooks automatically invalidate the contracts list cache, triggering a refetch:

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: contractKeys.lists() })
}
```

## 🛠️ React Query DevTools

The DevTools are included in development mode. Press the React Query icon in the bottom-right corner to open the DevTools panel and inspect:
- Active queries
- Query states
- Cache data
- Mutations
- Query invalidation

## 📝 Best Practices

1. **Use Query Keys Consistently**: Always use the `contractKeys` object for query keys
2. **Handle Loading States**: Always show loading indicators when `isLoading` is true
3. **Handle Errors**: Always handle error states gracefully
4. **Optimistic Updates**: Consider implementing optimistic updates for better UX
5. **Stale Time**: Adjust `staleTime` based on how frequently your data changes
6. **Pagination**: Use query keys with pagination params to cache different pages

## 🔗 Resources

- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [React Query Best Practices](https://tanstack.com/query/latest/docs/react/guides/important-defaults)
- [Query Keys Guide](https://tanstack.com/query/latest/docs/react/guides/query-keys)

## 🚀 Next Steps

To use React Query in your components:

1. Import the hooks from `@/hooks/useContracts`
2. Use them in your client components (add `'use client'` directive)
3. Handle loading, error, and success states
4. Enjoy automatic caching, refetching, and state management!


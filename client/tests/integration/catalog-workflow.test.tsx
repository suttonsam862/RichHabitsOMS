import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import '@testing-library/jest-dom';

// Mock components for testing
import CatalogPage from '../../src/pages/CatalogPage';
import { AuthProvider } from '../../src/context/AuthContext';

// Mock data
const mockCategories = [
  { id: '1', name: 'T-Shirts' },
  { id: '2', name: 'Hoodies' },
  { id: '3', name: 'Polo Shirts' }
];

const mockSports = [
  { id: '1', name: 'Basketball' },
  { id: '2', name: 'Football' },
  { id: '3', name: 'Soccer' }
];

const mockCatalogItems = [
  {
    id: '1',
    name: 'Premium Cotton T-Shirt',
    category: 'T-Shirts',
    sport: 'Basketball',
    unit_cost: 15.50,
    eta_days: 7,
    sku: 'TSHIRT-PREMIUM-001',
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Performance Hoodie',
    category: 'Hoodies', 
    sport: 'Football',
    unit_cost: 35.00,
    eta_days: 10,
    sku: 'HOODIE-PERF-002',
    created_at: '2024-01-02T00:00:00Z'
  }
];

// Mock server
const server = setupServer(
  rest.get('/api/catalog-options/categories', (req, res, ctx) => {
    return res(ctx.json(mockCategories));
  }),
  
  rest.get('/api/catalog-options/sports', (req, res, ctx) => {
    return res(ctx.json(mockSports));
  }),
  
  rest.get('/api/catalog-items', (req, res, ctx) => {
    return res(ctx.json(mockCatalogItems));
  }),
  
  rest.post('/api/catalog-items', (req, res, ctx) => {
    const newItem = req.body;
    return res(
      ctx.status(201),
      ctx.json({
        id: '3',
        ...newItem,
        created_at: new Date().toISOString()
      })
    );
  }),
  
  rest.post('/api/catalog-options/categories', (req, res, ctx) => {
    const newCategory = req.body;
    return res(
      ctx.status(201),
      ctx.json({
        id: '4',
        ...newCategory
      })
    );
  }),
  
  rest.post('/api/catalog-options/sports', (req, res, ctx) => {
    const newSport = req.body;
    return res(
      ctx.status(201),
      ctx.json({
        id: '4',
        ...newSport
      })
    );
  }),
  
  rest.get('/api/catalog-items/check-sku/:sku', (req, res, ctx) => {
    const { sku } = req.params;
    const exists = mockCatalogItems.some(item => item.sku === sku);
    return res(ctx.json({ exists }));
  }),
  
  rest.delete('/api/catalog-items/:id', (req, res, ctx) => {
    return res(ctx.status(204));
  })
);

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('Catalog Workflow Integration Tests', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe('Catalog Items Display', () => {
    test('should load and display catalog items', async () => {
      render(
        <TestWrapper>
          <CatalogPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Premium Cotton T-Shirt')).toBeInTheDocument();
        expect(screen.getByText('Performance Hoodie')).toBeInTheDocument();
      });

      expect(screen.getByText('TSHIRT-PREMIUM-001')).toBeInTheDocument();
      expect(screen.getByText('HOODIE-PERF-002')).toBeInTheDocument();
    });

    test('should handle empty catalog', async () => {
      server.use(
        rest.get('/api/catalog-items', (req, res, ctx) => {
          return res(ctx.json([]));
        })
      );

      render(
        <TestWrapper>
          <CatalogPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/no catalog items/i)).toBeInTheDocument();
      });
    });

    test('should display item details correctly', async () => {
      render(
        <TestWrapper>
          <CatalogPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Premium Cotton T-Shirt')).toBeInTheDocument();
      });

      expect(screen.getByText('$15.50')).toBeInTheDocument();
      expect(screen.getByText('7 days')).toBeInTheDocument();
      expect(screen.getByText('Basketball')).toBeInTheDocument();
    });
  });

  describe('Add Catalog Item', () => {
    test('should create new catalog item with valid data', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CatalogPage />
        </TestWrapper>
      );

      // Open add item form
      const addButton = await screen.findByText(/add item/i);
      await user.click(addButton);

      // Fill form fields
      await user.type(screen.getByLabelText(/name/i), 'New Polo Shirt');
      
      // Select category
      const categorySelect = screen.getByLabelText(/category/i);
      await user.click(categorySelect);
      await user.click(screen.getByText('Polo Shirts'));
      
      // Select sport
      const sportSelect = screen.getByLabelText(/sport/i);
      await user.click(sportSelect);
      await user.click(screen.getByText('Soccer'));
      
      await user.type(screen.getByLabelText(/unit cost/i), '25.00');
      await user.type(screen.getByLabelText(/eta/i), '5');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      // Verify success
      await waitFor(() => {
        expect(screen.getByText('Catalog item created successfully')).toBeInTheDocument();
      });
    });

    test('should validate required fields', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CatalogPage />
        </TestWrapper>
      );

      const addButton = await screen.findByText(/add item/i);
      await user.click(addButton);

      // Try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      // Verify validation errors
      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/category is required/i)).toBeInTheDocument();
      });
    });

    test('should auto-generate SKU', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CatalogPage />
        </TestWrapper>
      );

      const addButton = await screen.findByText(/add item/i);
      await user.click(addButton);

      // Fill item name and category
      await user.type(screen.getByLabelText(/name/i), 'Test Item');
      
      const categorySelect = screen.getByLabelText(/category/i);
      await user.click(categorySelect);
      await user.click(screen.getByText('T-Shirts'));

      // Check that SKU is auto-generated
      const skuField = screen.getByLabelText(/sku/i);
      await waitFor(() => {
        expect(skuField).toHaveValue(expect.stringMatching(/TSHIRTS?-.*-.*/));
      });
    });

    test('should validate SKU uniqueness', async () => {
      const user = userEvent.setup();
      
      server.use(
        rest.get('/api/catalog-items/check-sku/:sku', (req, res, ctx) => {
          return res(ctx.json({ exists: true }));
        })
      );

      render(
        <TestWrapper>
          <CatalogPage />
        </TestWrapper>
      );

      const addButton = await screen.findByText(/add item/i);
      await user.click(addButton);

      // Enter duplicate SKU
      const skuField = screen.getByLabelText(/sku/i);
      await user.clear(skuField);
      await user.type(skuField, 'TSHIRT-PREMIUM-001');

      await user.tab(); // Trigger blur event

      // Verify SKU validation error
      await waitFor(() => {
        expect(screen.getByText(/sku already exists/i)).toBeInTheDocument();
      });
    });

    test('should validate numeric fields', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CatalogPage />
        </TestWrapper>
      );

      const addButton = await screen.findByText(/add item/i);
      await user.click(addButton);

      // Enter invalid numeric values
      await user.type(screen.getByLabelText(/unit cost/i), 'invalid');
      await user.type(screen.getByLabelText(/eta/i), '-5');

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      // Verify validation errors
      await waitFor(() => {
        expect(screen.getByText(/invalid unit cost/i)).toBeInTheDocument();
        expect(screen.getByText(/eta must be positive/i)).toBeInTheDocument();
      });
    });
  });

  describe('Category and Sport Management', () => {
    test('should add new category', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CatalogPage />
        </TestWrapper>
      );

      const addButton = await screen.findByText(/add item/i);
      await user.click(addButton);

      // Open category dropdown and select "Add Category"
      const categorySelect = screen.getByLabelText(/category/i);
      await user.click(categorySelect);
      await user.click(screen.getByText(/add category/i));

      // Fill new category name
      const categoryInput = screen.getByPlaceholderText(/category name/i);
      await user.type(categoryInput, 'Sweatshirts');

      // Save new category
      const saveCategoryButton = screen.getByRole('button', { name: /add category/i });
      await user.click(saveCategoryButton);

      // Verify new category is available
      await waitFor(() => {
        expect(screen.getByText('Sweatshirts')).toBeInTheDocument();
      });
    });

    test('should add new sport', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CatalogPage />
        </TestWrapper>
      );

      const addButton = await screen.findByText(/add item/i);
      await user.click(addButton);

      // Open sport dropdown and select "Add Sport"
      const sportSelect = screen.getByLabelText(/sport/i);
      await user.click(sportSelect);
      await user.click(screen.getByText(/add sport/i));

      // Fill new sport name
      const sportInput = screen.getByPlaceholderText(/sport name/i);
      await user.type(sportInput, 'Tennis');

      // Save new sport
      const saveSportButton = screen.getByRole('button', { name: /add sport/i });
      await user.click(saveSportButton);

      // Verify new sport is available
      await waitFor(() => {
        expect(screen.getByText('Tennis')).toBeInTheDocument();
      });
    });

    test('should validate duplicate category names', async () => {
      const user = userEvent.setup();
      
      server.use(
        rest.post('/api/catalog-options/categories', (req, res, ctx) => {
          return res(
            ctx.status(409),
            ctx.json({ error: 'Category already exists' })
          );
        })
      );

      render(
        <TestWrapper>
          <CatalogPage />
        </TestWrapper>
      );

      const addButton = await screen.findByText(/add item/i);
      await user.click(addButton);

      const categorySelect = screen.getByLabelText(/category/i);
      await user.click(categorySelect);
      await user.click(screen.getByText(/add category/i));

      const categoryInput = screen.getByPlaceholderText(/category name/i);
      await user.type(categoryInput, 'T-Shirts');

      const saveCategoryButton = screen.getByRole('button', { name: /add category/i });
      await user.click(saveCategoryButton);

      // Verify duplicate error handling
      await waitFor(() => {
        expect(screen.getByText(/category already exists/i)).toBeInTheDocument();
      });
    });
  });

  describe('Catalog Item Management', () => {
    test('should edit existing catalog item', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CatalogPage />
        </TestWrapper>
      );

      // Wait for items to load
      await waitFor(() => {
        expect(screen.getByText('Premium Cotton T-Shirt')).toBeInTheDocument();
      });

      // Click edit button for first item
      const editButton = screen.getAllByText(/edit/i)[0];
      await user.click(editButton);

      // Update item name
      const nameInput = screen.getByDisplayValue('Premium Cotton T-Shirt');
      await user.clear(nameInput);
      await user.type(nameInput, 'Premium Cotton T-Shirt Updated');

      // Save changes
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Verify update success
      await waitFor(() => {
        expect(screen.getByText('Catalog item updated successfully')).toBeInTheDocument();
      });
    });

    test('should delete catalog item with confirmation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CatalogPage />
        </TestWrapper>
      );

      // Wait for items to load
      await waitFor(() => {
        expect(screen.getByText('Premium Cotton T-Shirt')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButton = screen.getAllByText(/delete/i)[0];
      await user.click(deleteButton);

      // Confirm deletion
      const confirmButton = await screen.findByText(/confirm/i);
      await user.click(confirmButton);

      // Verify deletion success
      await waitFor(() => {
        expect(screen.getByText('Catalog item deleted successfully')).toBeInTheDocument();
      });
    });

    test('should search and filter catalog items', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CatalogPage />
        </TestWrapper>
      );

      // Wait for items to load
      await waitFor(() => {
        expect(screen.getByText('Premium Cotton T-Shirt')).toBeInTheDocument();
        expect(screen.getByText('Performance Hoodie')).toBeInTheDocument();
      });

      // Search for specific item
      const searchInput = screen.getByPlaceholderText(/search catalog/i);
      await user.type(searchInput, 'Hoodie');

      // Verify filtered results
      await waitFor(() => {
        expect(screen.getByText('Performance Hoodie')).toBeInTheDocument();
        expect(screen.queryByText('Premium Cotton T-Shirt')).not.toBeInTheDocument();
      });
    });

    test('should filter by category', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CatalogPage />
        </TestWrapper>
      );

      // Wait for items to load
      await waitFor(() => {
        expect(screen.getByText('Premium Cotton T-Shirt')).toBeInTheDocument();
        expect(screen.getByText('Performance Hoodie')).toBeInTheDocument();
      });

      // Filter by T-Shirts category
      const categoryFilter = screen.getByLabelText(/filter by category/i);
      await user.click(categoryFilter);
      await user.click(screen.getByText('T-Shirts'));

      // Verify filtered results
      await waitFor(() => {
        expect(screen.getByText('Premium Cotton T-Shirt')).toBeInTheDocument();
        expect(screen.queryByText('Performance Hoodie')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle API errors during item creation', async () => {
      const user = userEvent.setup();
      
      server.use(
        rest.post('/api/catalog-items', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Internal server error' }));
        })
      );

      render(
        <TestWrapper>
          <CatalogPage />
        </TestWrapper>
      );

      const addButton = await screen.findByText(/add item/i);
      await user.click(addButton);

      // Fill minimal required fields
      await user.type(screen.getByLabelText(/name/i), 'Test Item');
      
      const categorySelect = screen.getByLabelText(/category/i);
      await user.click(categorySelect);
      await user.click(screen.getByText('T-Shirts'));

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText(/error creating catalog item/i)).toBeInTheDocument();
      });
    });

    test('should handle extremely long item names', async () => {
      const user = userEvent.setup();
      const longName = 'A'.repeat(300);
      
      render(
        <TestWrapper>
          <CatalogPage />
        </TestWrapper>
      );

      const addButton = await screen.findByText(/add item/i);
      await user.click(addButton);

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, longName);

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      // Should handle validation for max length
      await waitFor(() => {
        expect(screen.getByText(/name too long/i)).toBeInTheDocument();
      });
    });

    test('should handle special characters in SKU', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CatalogPage />
        </TestWrapper>
      );

      const addButton = await screen.findByText(/add item/i);
      await user.click(addButton);

      const skuField = screen.getByLabelText(/sku/i);
      await user.clear(skuField);
      await user.type(skuField, 'SKU-WITH-@#$-CHARS');

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      // Should validate SKU format
      await waitFor(() => {
        expect(screen.getByText(/invalid sku format/i)).toBeInTheDocument();
      });
    });

    test('should handle very large unit costs', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CatalogPage />
        </TestWrapper>
      );

      const addButton = await screen.findByText(/add item/i);
      await user.click(addButton);

      await user.type(screen.getByLabelText(/name/i), 'Expensive Item');
      await user.type(screen.getByLabelText(/unit cost/i), '999999.99');

      const categorySelect = screen.getByLabelText(/category/i);
      await user.click(categorySelect);
      await user.click(screen.getByText('T-Shirts'));

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      // Should handle large numbers properly
      await waitFor(() => {
        expect(screen.getByText('Catalog item created successfully')).toBeInTheDocument();
      });
    });
  });
});
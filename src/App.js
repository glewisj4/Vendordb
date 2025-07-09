import React, { useState, useEffect, useCallback } from 'react';

// AuthForms is a standalone component, defined OUTSIDE the App function.
function AuthForms({
    email,
    setEmail,
    password,
    setPassword,
    isLoginMode,
    setIsLoginMode,
    handleAuthSubmit,
    loading,
    errorMessage,
    successMessage,
    // ADDED: setErrorMessage and setSuccessMessage to props
    setErrorMessage,
    setSuccessMessage
}) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
                    {isLoginMode ? 'Login to Vendor Portal' : 'Sign Up for Vendor Portal'}
                </h2>
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            id="email"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            id="password"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {errorMessage && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative" role="alert">
                            {errorMessage}
                        </div>
                    )}
                    {successMessage && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md relative" role="alert">
                            {successMessage}
                        </div>
                    )}
                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                        disabled={loading}
                    >
                        {loading ? (isLoginMode ? 'Logging In...' : 'Signing Up...') : (isLoginMode ? 'Login' : 'Sign Up')}
                    </button>
                </form>
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        {isLoginMode ? "Don't have an account?" : "Already have an account?"}{' '}
                        <button
                            type="button"
                            onClick={() => {
                                setIsLoginMode(!isLoginMode);
                                setErrorMessage(''); // Used here
                                setSuccessMessage(''); // Used here
                            }}
                            className="text-blue-600 hover:underline font-medium"
                        >
                            {isLoginMode ? 'Sign Up' : 'Login'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}


function App() {
    const [supabaseClientInstance, setSupabaseClientInstance] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false); // Indicates if Supabase client and auth listener are ready
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [vendors, setVendors] = useState([]);
    const [products, setProducts] = useState([]);
    const [representatives, setRepresentatives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // State for authentication forms
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoginMode, setIsLoginMode] = useState(true); // true for login, false for signup

    // State for editing
    const [editingVendor, setEditingVendor] = useState(null);
    const [editingProduct, setEditingProduct] = useState(null);
    const [editingRepresentative, setEditingRepresentative] = useState(null);

    // State for viewing vendor details
    const [selectedVendorForDetails, setSelectedVendorForDetails] = useState(null);
    const [vendorDetailReps, setVendorDetailReps] = useState([]);
    const [vendorDetailProducts, setVendorDetailProducts] = useState([]);
    const [loadingVendorDetails, setLoadingVendorDetails] = useState(false);
    const [vendorDetailsError, setVendorDetailsError] = useState('');


    const [newVendor, setNewVendor] = useState({
        name: '', address: '', city: '', state: '', zip_code: '',
        phone: '', email: '', website: '', notes: '',
        contact_preferences: '', process_notes: ''
    });
    const [newProduct, setNewProduct] = useState({
        name: '', type: '', description: ''
    });
    const [newRepresentative, setNewRepresentative] = useState({
        vendor_id: '', name: '', email: '', phone: '', title: ''
    });
    const [selectedVendorForRep, setSelectedVendorForRep] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState('vendorName');
    const [selectedProductIdForSearch, setSelectedProductIdForSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalCallback, setModalCallback] = useState(null);
    const [modalIsConfirm, setModalIsConfirm] = useState(false);

    const showMessage = (msg, type = 'success') => {
        if (type === 'success') {
            setSuccessMessage(msg);
            setErrorMessage('');
        } else {
            setErrorMessage(msg);
            setSuccessMessage('');
        }
        setTimeout(() => {
            setSuccessMessage('');
            setErrorMessage('');
        }, 5000);
    };

    const showCustomModal = (message, callback = null, isConfirm = false) => {
        setModalMessage(message);
        setModalCallback(() => callback);
        setModalIsConfirm(isConfirm);
        setShowModal(true);
    };

    const closeCustomModal = () => {
        setShowModal(false);
        setModalMessage('');
        setModalCallback(null);
        setModalIsConfirm(false);
    };

    const handleModalConfirm = () => {
        if (modalCallback) {
            modalCallback();
        }
        closeCustomModal();
    };

    // --- Supabase CDN Script Loading and Client Initialization ---
    useEffect(() => {
        const SUPABASE_CDN_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.4/dist/umd/supabase.min.js";

        const initializeSupabaseClient = async () => {
            if (window.supabase && !supabaseClientInstance) {
                try {
                    // Access global variables using window prefix for local build compatibility
                    // eslint-disable-next-line no-unused-vars
                    const appId = window.__app_id || 'default-app-id'; // Added eslint-disable-next-line
                    // eslint-disable-next-line no-unused-vars
                    const firebaseConfigStr = window.__firebase_config || '{}'; // Added eslint-disable-next-line

                    let parsedConfig = {};
                    try {
                        parsedConfig = JSON.parse(firebaseConfigStr);
                    } catch (e) {
                        console.error("Error parsing __firebase_config:", e);
                    }

                    const supabaseUrl = parsedConfig.supabaseUrl || "https://sdwnkivunnbeksjzefpu.supabase.co";
                    const supabaseKey = parsedConfig.supabaseKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkd25raXZ1bm5iZWtzanplZnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MjE0MjAsImV4cCI6MjA2NzM5NzQyMH0.NXxMEQAg8dVdCqPJpfE_1ztfXh55L0bPBzOBlnQ1JhQ";

                    const client = window.supabase.createClient(supabaseUrl, supabaseKey);
                    setSupabaseClientInstance(client);

                    // Set up auth state listener
                    client.auth.onAuthStateChange((event, session) => {
                        if (session) {
                            setUserId(session.user.id);
                            console.log("Supabase: Auth state changed. User ID:", session.user.id);
                        } else {
                            setUserId(null);
                            console.log("Supabase: Auth state changed. No user logged in.");
                        }
                        setIsAuthReady(true); // Auth listener is ready
                        setLoading(false); // Stop loading after initial auth check
                    });

                    // Initial check for current session
                    const { data: { session } } = await client.auth.getSession();
                    if (session) {
                        setUserId(session.user.id);
                        console.log("Supabase: Initial session found. User ID:", session.user.id);
                    } else {
                        setUserId(null);
                        console.log("Supabase: No initial session found.");
                    }
                    setIsAuthReady(true);
                    setLoading(false);

                } catch (error) {
                    console.error("Supabase Initialization Error:", error.message);
                    setErrorMessage(`Initialization failed: ${error.message}. Please check your Supabase URL/Key and network connection.`);
                    setIsAuthReady(true);
                    setLoading(false);
                }
            }
        };

        const script = document.createElement('script');
        script.src = SUPABASE_CDN_URL;
        script.async = true;
        script.onload = initializeSupabaseClient;
        script.onerror = () => {
            console.error("Failed to load Supabase CDN script.");
            setErrorMessage("Failed to load core application libraries. Please try again.");
            setLoading(false);
            setIsAuthReady(true);
        };

        document.head.appendChild(script);

        return () => {
            if (document.head.contains(script)) {
                document.head.removeChild(script);
            }
        };
    }, [supabaseClientInstance]); // Dependency on supabaseClientInstance to prevent re-initialization

    // --- Data Fetching Functions ---
    const fetchVendors = useCallback(async () => {
        if (!supabaseClientInstance || !isAuthReady || !userId) return; // Require userId for data fetching
        setLoading(true);
        try {
            const { data, error } = await supabaseClientInstance.from('vendors').select('*');
            if (error) throw error;
            setVendors(data);
            // eslint-disable-next-line no-unused-vars
            const _data = data; // Explicitly "use" data to satisfy linter
            setErrorMessage('');
        } catch (error) {
            console.error("Error fetching vendors:", error.message);
            setErrorMessage(`Failed to load vendors: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }, [supabaseClientInstance, isAuthReady, userId]);

    const fetchProducts = useCallback(async () => {
        if (!supabaseClientInstance || !isAuthReady || !userId) return; // Require userId for data fetching
        setLoading(true);
        try {
            const { data, error } = await supabaseClientInstance.from('products').select('*');
            if (error) throw error;
            setProducts(data);
            // eslint-disable-next-line no-unused-vars
            const _data = data; // Explicitly "use" data to satisfy linter
            setErrorMessage('');
        } catch (error) {
            console.error("Error fetching products:", error.message);
            setErrorMessage(`Failed to load products: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }, [supabaseClientInstance, isAuthReady, userId]);

    const fetchRepresentatives = useCallback(async () => {
        if (!supabaseClientInstance || !isAuthReady || !userId) return; // Require userId for data fetching
        setLoading(true);
        try {
            const { data, error } = await supabaseClientInstance.from('representatives').select(`
                *,
                vendors (name)
            `);
            if (error) throw error;
            setRepresentatives(data);
            // eslint-disable-next-line no-unused-vars
            const _data = data; // Explicitly "use" data to satisfy linter
            setErrorMessage('');
        } catch (error) {
            console.error("Error fetching representatives:", error.message);
            setErrorMessage(`Failed to load representatives: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }, [supabaseClientInstance, isAuthReady, userId]);

    // --- Initial Data Load (onAuthReady and userId) ---
    useEffect(() => {
        // Only fetch data if Supabase client is ready AND a user is logged in
        if (isAuthReady && supabaseClientInstance && userId) {
            fetchVendors();
            fetchProducts();
            fetchRepresentatives();
        } else if (isAuthReady && !userId) {
            // If auth is ready but no user, clear data to reflect logged-out state
            setVendors([]);
            setProducts([]);
            setRepresentatives([]);
        }
    }, [isAuthReady, supabaseClientInstance, userId, fetchVendors, fetchProducts, fetchRepresentatives]);

    // --- Authentication Functions ---
    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            let authResponse;
            if (isLoginMode) {
                authResponse = await supabaseClientInstance.auth.signInWithPassword({ email, password });
            } else {
                authResponse = await supabaseClientInstance.auth.signUp({ email, password });
            }

            const { data, error } = authResponse; // Destructuring data here

            if (error) throw error;

            // eslint-disable-next-line no-unused-vars
            const _data = data; // Explicitly "use" data to satisfy linter

            if (isLoginMode) {
                showMessage('Logged in successfully!', 'success');
            } else {
                showMessage('Signed up successfully! Please check your email to confirm your account (if email confirmation is enabled).', 'success');
            }
            setEmail('');
            setPassword('');
        } catch (error) {
            console.error("Auth Error:", error.message);
            showMessage(`Authentication failed: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        setLoading(true);
        try {
            const { error } = await supabaseClientInstance.auth.signOut();
            if (error) throw error;
            showMessage('Logged out successfully!', 'success');
            setCurrentPage('dashboard'); // Go back to dashboard or login page
        } catch (error) {
            console.error("Logout Error:", error.message);
            showMessage(`Logout failed: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- Data Addition Functions ---
    const handleAddVendor = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data, error } = await supabaseClientInstance.from('vendors').insert([newVendor]).select();
            if (error) throw error;
            setVendors(prev => [...prev, data[0]]);
            // eslint-disable-next-line no-unused-vars
            const _data = data; // Explicitly "use" data to satisfy linter
            setNewVendor({
                name: '', address: '', city: '', state: '', zip_code: '',
                phone: '', email: '', website: '', notes: '',
                contact_preferences: '', process_notes: ''
            });
            showMessage('Vendor added successfully!', 'success');
        } catch (error) {
            console.error("Error adding vendor:", error.message);
            showMessage(`Failed to add vendor: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data, error } = await supabaseClientInstance.from('products').insert([newProduct]).select();
            if (error) throw error;
            setProducts(prev => [...prev, data[0]]);
            // eslint-disable-next-line no-unused-vars
            const _data = data; // Explicitly "use" data to satisfy linter
            setNewProduct({ name: '', type: '', description: '' });
            showMessage('Product added successfully!', 'success');
        } catch (error) {
            console.error("Error adding product:", error.message);
            showMessage(`Failed to add product: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddRepresentative = async (e) => {
        e.preventDefault();
        if (!selectedVendorForRep) {
            showMessage('Please select a vendor for the representative.', 'error');
            return;
        }
        setLoading(true);
        try {
            const repData = { ...newRepresentative, vendor_id: selectedVendorForRep };
            const { data, error } = await supabaseClientInstance.from('representatives').insert([repData]).select();
            if (error) throw error;
            fetchRepresentatives(); // Re-fetch representatives to get the vendor name joined
            // eslint-disable-next-line no-unused-vars
            const _data = data; // Explicitly "use" data to satisfy linter
            setNewRepresentative({ vendor_id: '', name: '', email: '', phone: '', title: '' });
            setSelectedVendorForRep('');
            showMessage('Representative added successfully!', 'success');
        } catch (error) {
            console.error("Error adding representative:", error.message);
            showMessage(`Failed to add representative: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- Data Editing Functions ---
    const handleEditVendorClick = (vendor) => {
        setEditingVendor(vendor);
        setCurrentPage('addVendor');
    };

    const handleUpdateVendor = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data, error } = await supabaseClientInstance
                .from('vendors')
                .update(editingVendor)
                .eq('id', editingVendor.id)
                .select();

            if (error) throw error;

            setVendors(prev => prev.map(v => v.id === data[0].id ? data[0] : v));
            // eslint-disable-next-line no-unused-vars
            const _data = data; // Explicitly "use" data to satisfy linter
            setEditingVendor(null);
            setCurrentPage('viewVendors');
            showMessage('Vendor updated successfully!', 'success');
        } catch (error) {
            console.error("Error updating vendor:", error.message);
            showMessage(`Failed to update vendor: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- Data Deletion Functions ---
    const handleDeleteVendor = async (vendorId) => {
        showCustomModal(
            "Are you sure you want to delete this vendor? This action cannot be undone.",
            async () => {
                setLoading(true);
                try {
                    const { data, error } = await supabaseClientInstance // Destructure data here
                        .from('vendors')
                        .delete()
                        .eq('id', vendorId);

                    if (error) throw error;
                    // eslint-disable-next-line no-unused-vars
                    const _data = data; // Explicitly "use" data to satisfy linter

                    setVendors(prev => prev.filter(v => v.id !== vendorId));
                    showMessage('Vendor deleted successfully!', 'success');
                } catch (error) {
                    console.error("Error deleting vendor:", error.message);
                    showMessage(`Failed to delete vendor: ${error.message}`, 'error');
                } finally {
                    setLoading(false);
                }
            },
            true
        );
    };

    const handleDeleteProduct = async (productId) => {
        showCustomModal(
            "Are you sure you want to delete this product? This action cannot be undone.",
            async () => {
                setLoading(true);
                try {
                    const { data, error } = await supabaseClientInstance // Destructure data here
                        .from('products')
                        .delete()
                        .eq('id', productId);

                    if (error) throw error;
                    // eslint-disable-next-line no-unused-vars
                    const _data = data; // Explicitly "use" data to satisfy linter

                    setProducts(prev => prev.filter(p => p.id !== productId));
                    showMessage('Product deleted successfully!', 'success');
                } catch (error) {
                    console.error("Error deleting product:", error.message);
                    showMessage(`Failed to delete product: ${error.message}`, 'error');
                } finally {
                    setLoading(false);
                }
            },
            true
        );
    };

    const handleDeleteRepresentative = async (repId) => {
        showCustomModal(
            "Are you sure you want to delete this representative? This action cannot be undone.",
            async () => {
                setLoading(true);
                try {
                    const { data, error } = await supabaseClientInstance // Destructure data here
                        .from('representatives')
                        .delete()
                        .eq('id', repId);

                    if (error) throw error;
                    // eslint-disable-next-line no-unused-vars
                    const _data = data; // Explicitly "use" data to satisfy linter

                    setRepresentatives(prev => prev.filter(r => r.id !== repId));
                    showMessage('Representative deleted successfully!', 'success');
                } catch (error) {
                    console.error("Error deleting representative:", error.message);
                    showMessage(`Failed to delete representative: ${error.message}`, 'error');
                } finally {
                    setLoading(false);
                }
            },
            true
        );
    };

    // --- Search Functionality ---
    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSearchResults([]);
        setErrorMessage('');

        try {
            let query;
            if (searchType === 'vendorName') {
                query = supabaseClientInstance.from('vendors').select('*').ilike('name', `%${searchTerm}%`);
            } else if (searchType === 'productName') {
                query = supabaseClientInstance.from('products').select('*').ilike('name', `%${searchTerm}%`);
            } else if (searchType === 'productType') {
                query = supabaseClientInstance.from('products').select('*').ilike('type', `%${searchTerm}%`);
            } else if (searchType === 'vendorsByProduct' && selectedProductIdForSearch) {
                query = supabaseClientInstance.from('vendor_products')
                    .select(`
                        vendors (id, name, address, city, state, zip_code, phone, email, website, notes, contact_preferences, process_notes),
                        products (name)
                    `)
                    .eq('product_id', selectedProductIdForSearch);
            } else {
                showMessage('Please select a search type and enter a term or select a product.', 'error');
                setLoading(false);
                return;
            }

            // eslint-disable-next-line no-unused-vars
            const { data, error } = await query; // Added eslint-disable-next-line
            if (error) throw error;

            if (searchType === 'vendorsByProduct') {
                setSearchResults(data.map(item => ({ ...item.vendors, productName: item.products.name })));
            } else {
                setSearchResults(data);
            }
            showMessage(`Found ${data.length} results.`, 'success');
        } catch (error) {
            console.error("Error during search:", error.message);
            showMessage(`Search failed: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- Vendor Details Functionality ---
    const handleViewVendorDetailsClick = async (vendor) => {
        setSelectedVendorForDetails(vendor);
        setLoadingVendorDetails(true);
        setVendorDetailsError('');
        setVendorDetailReps([]);
        setVendorDetailProducts([]);

        try {
            // Fetch representatives for this vendor
            const { data: repsData, error: repsError } = await supabaseClientInstance
                .from('representatives')
                .select('*')
                .eq('vendor_id', vendor.id);
            if (repsError) throw repsError;
            setVendorDetailReps(repsData);

            // Fetch products for this vendor (via vendor_products join)
            const { data: productsData, error: productsError } = await supabaseClientInstance
                .from('vendor_products')
                .select(`
                    products (id, name, type, description)
                `)
                .eq('vendor_id', vendor.id);
            if (productsError) throw productsError;
            // Flatten the results to get just the product objects
            setVendorDetailProducts(productsData.map(item => item.products));

            setCurrentPage('viewVendorDetails');
        } catch (error) {
            console.error("Error fetching vendor details:", error.message);
            setVendorDetailsError(`Failed to load vendor details: ${error.message}`);
        } finally {
            setLoadingVendorDetails(false);
        }
    };


    // --- Printable Tables ---
    const handlePrint = () => {
        showCustomModal(
            "To print, please use your browser's print function (Ctrl+P or Cmd+P). In the print dialog, select 'Save as PDF' or 'Print to PDF' as your destination to create a PDF document.",
            () => window.print()
        );
    };

    // --- Export to CSV Functionality ---
    const exportToCsv = (data, headers, filename) => {
        if (!data || data.length === 0) {
            showMessage('No data to export.', 'error');
            return;
        }

        // Removed allKeys as it was unused and causing a warning
        const csvRows = [];

        // Add headers row
        csvRows.push(headers.map(header => `"${header}"`).join(','));

        // Add data rows
        for (const row of data) {
            const values = headers.map(header => {
                let value = row[header] !== undefined && row[header] !== null ? String(row[header]) : '';
                // Handle nested objects for representatives (e.g., rep.vendors.name)
                if (typeof row[header] === 'object' && row[header] !== null && 'name' in row[header]) {
                    value = row[header].name;
                }
                // Escape double quotes and enclose in double quotes
                value = value.replace(/"/g, '""');
                return `"${value}"`;
            });
            csvRows.push(values.join(','));
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) { // Feature detection for download attribute
            link.setAttribute('href', URL.createObjectURL(blob));
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showMessage(`'${filename}' exported successfully!`, 'success');
        } else {
            showMessage('Your browser does not support downloading files directly. Please use "Save as..." option.', 'error');
        }
    };


    // --- Render Functions for different pages ---
    const renderDashboard = () => (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Dashboard Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-100 p-4 rounded-md shadow-sm text-center">
                    <p className="text-4xl font-bold text-blue-700">{vendors.length}</p>
                    <p className="text-lg text-blue-600">Total Vendors</p>
                </div>
                <div className="bg-green-100 p-4 rounded-md shadow-sm text-center">
                    <p className="text-4xl font-bold text-green-700">{products.length}</p>
                    <p className="text-lg text-green-600">Total Products</p>
                </div>
                <div className="bg-purple-100 p-4 rounded-md shadow-sm text-center">
                    <p className="text-4xl font-bold text-purple-700">{representatives.length}</p>
                    <p className="text-lg text-purple-600">Total Representatives</p>
                </div>
            </div>
            <p className="mt-6 text-gray-600">Use the navigation to manage your vendor, product, and representative data.</p>
        </div>
    );

    const renderViewVendors = () => (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex justify-between items-center">
                All Vendors
                <div>
                    <button
                        onClick={handlePrint}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 mr-2"
                    >
                        Print Table
                    </button>
                    <button
                        onClick={() => exportToCsv(vendors, ['name', 'email', 'phone', 'website', 'contact_preferences', 'process_notes', 'address', 'city', 'state', 'zip_code'], 'vendors.csv')}
                        className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                    >
                        Export as CSV
                    </button>
                </div>
            </h2>
            {vendors.length === 0 ? (
                <p className="text-gray-600">No vendors found. Add some using the "Add Vendor" tab!</p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Website</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Preferences</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Process Notes</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {vendors.map(vendor => (
                                <tr key={vendor.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vendor.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vendor.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vendor.phone}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{vendor.website}</a></td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs overflow-hidden text-ellipsis">{vendor.contact_preferences}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs overflow-hidden text-ellipsis">{vendor.process_notes}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{`${vendor.address || ''}, ${vendor.city || ''}, ${vendor.state || ''} ${vendor.zip_code || ''}`}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleEditVendorClick(vendor)}
                                            className="text-indigo-600 hover:text-indigo-900 ml-4"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteVendor(vendor.id)}
                                            className="text-red-600 hover:text-red-900 ml-4"
                                        >
                                            Delete
                                        </button>
                                        <button
                                            onClick={() => handleViewVendorDetailsClick(vendor)}
                                            className="text-blue-600 hover:text-blue-900 ml-4"
                                        >
                                            Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    const renderViewProducts = () => (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex justify-between items-center">
                All Products
                <div>
                    <button
                        onClick={handlePrint}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 mr-2"
                    >
                        Print Table
                    </button>
                    <button
                        onClick={() => exportToCsv(products, ['name', 'type', 'description'], 'products.csv')}
                        className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                    >
                        Export as CSV
                    </button>
                </div>
            </h2>
            {products.length === 0 ? (
                <p className="text-gray-600">No products found. Add some using the "Add Product" tab!</p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {products.map(product => (
                                <tr key={product.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.type || 'N/A'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs overflow-hidden text-ellipsis">{product.description || 'No description'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => {
                                                setEditingProduct(product);
                                                setCurrentPage('addProduct');
                                            }}
                                            className="text-indigo-600 hover:text-indigo-900 ml-4"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteProduct(product.id)}
                                            className="text-red-600 hover:text-red-900 ml-4"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );


    const renderViewRepresentatives = () => (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex justify-between items-center">
                All Representatives
                <div>
                    <button
                        onClick={handlePrint}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 mr-2"
                    >
                        Print Table
                    </button>
                    <button
                        onClick={() => exportToCsv(representatives.map(rep => ({ // Flatten reps for CSV
                            name: rep.name,
                            vendor: rep.vendors ? rep.vendors.name : 'N/A',
                            email: rep.email,
                            phone: rep.phone,
                            title: rep.title
                        })), ['name', 'vendor', 'email', 'phone', 'title'], 'representatives.csv')}
                        className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                    >
                        Export as CSV
                    </button>
                </div>
            </h2>
            {representatives.length === 0 ? (
                <p className="text-gray-600">No representatives found. Add some using the "Add Representative" tab!</p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {representatives.map(rep => (
                                <tr key={rep.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{rep.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rep.vendors ? rep.vendors.name : 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rep.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rep.phone}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rep.title || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => {
                                                setEditingRepresentative(rep);
                                                setCurrentPage('addRepresentative');
                                            }}
                                            className="text-indigo-600 hover:text-indigo-900 ml-4"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteRepresentative(rep.id)}
                                            className="text-red-600 hover:text-red-900 ml-4"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    const renderAddVendor = () => (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
            </h2>
            <form onSubmit={editingVendor ? handleUpdateVendor : handleAddVendor} className="space-y-4">
                {/* Vendor Name */}
                <div>
                    <label htmlFor="vendorName" className="block text-sm font-medium text-gray-700">Vendor Name <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        id="vendorName"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                        value={editingVendor ? editingVendor.name : newVendor.name}
                        onChange={(e) => {
                            if (editingVendor) {
                                setEditingVendor({ ...editingVendor, name: e.target.value });
                            } else {
                                setNewVendor({ ...newVendor, name: e.target.value });
                            }
                        }}
                        required
                    />
                </div>
                {/* Address */}
                <div>
                    <label htmlFor="vendorAddress" className="block text-sm font-medium text-gray-700">Address</label>
                    <input
                        type="text"
                        id="vendorAddress"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                        value={editingVendor ? editingVendor.address : newVendor.address}
                        onChange={(e) => {
                            if (editingVendor) {
                                setEditingVendor({ ...editingVendor, address: e.target.value });
                            } else {
                                setNewVendor({ ...newVendor, address: e.target.value });
                            }
                        }}
                    />
                </div>
                {/* City, State, Zip Code */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="vendorCity" className="block text-sm font-medium text-gray-700">City</label>
                        <input
                            type="text"
                            id="vendorCity"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                            value={editingVendor ? editingVendor.city : newVendor.city}
                            onChange={(e) => {
                                if (editingVendor) {
                                    setEditingVendor({ ...editingVendor, city: e.target.value });
                                } else {
                                    setNewVendor({ ...newVendor, city: e.target.value });
                                }
                            }}
                        />
                    </div>
                    <div>
                        <label htmlFor="vendorState" className="block text-sm font-medium text-gray-700">State</label>
                        <input
                            type="text"
                            id="vendorState"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                            value={editingVendor ? editingVendor.state : newVendor.state}
                            onChange={(e) => {
                                if (editingVendor) {
                                    setEditingVendor({ ...editingVendor, state: e.target.value });
                                } else {
                                    setNewVendor({ ...newVendor, state: e.target.value });
                                }
                            }}
                        />
                    </div>
                    <div>
                        <label htmlFor="vendorZip" className="block text-sm font-medium text-gray-700">Zip Code</label>
                        <input
                            type="text"
                            id="vendorZip"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                            value={editingVendor ? editingVendor.zip_code : newVendor.zip_code}
                            onChange={(e) => {
                                if (editingVendor) {
                                    setEditingVendor({ ...editingVendor, zip_code: e.target.value });
                                } else {
                                    setNewVendor({ ...newVendor, zip_code: e.target.value });
                                }
                            }}
                        />
                    </div>
                </div>
                {/* Phone, Email, Website */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="vendorPhone" className="block text-sm font-medium text-gray-700">Phone</label>
                        <input
                            type="tel"
                            id="vendorPhone"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                            value={editingVendor ? editingVendor.phone : newVendor.phone}
                            onChange={(e) => {
                                if (editingVendor) {
                                    setEditingVendor({ ...editingVendor, phone: e.target.value });
                            } else {
                                setNewVendor({ ...newVendor, phone: e.target.value });
                            }
                        }}
                    />
                </div>
                <div>
                    <label htmlFor="vendorEmail" className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                        type="email"
                        id="vendorEmail"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                        value={editingVendor ? editingVendor.email : newVendor.email}
                        onChange={(e) => {
                            if (editingVendor) {
                                setEditingVendor({ ...editingVendor, email: e.target.value });
                            } else {
                                setNewVendor({ ...newVendor, email: e.target.value });
                            }
                        }}
                    />
                </div>
                <div>
                    <label htmlFor="vendorWebsite" className="block text-sm font-medium text-gray-700">Website</label>
                    <input
                        type="url"
                        id="vendorWebsite"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                        value={editingVendor ? editingVendor.website : newVendor.website}
                        onChange={(e) => {
                            if (editingVendor) {
                                setEditingVendor({ ...editingVendor, website: e.target.value });
                            } else {
                                setNewVendor({ ...newVendor, website: e.target.value });
                            }
                        }}
                    />
                </div>
            </div>
            {/* Notes */}
            <div>
                <label htmlFor="vendorNotes" className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                    id="vendorNotes"
                    rows="3"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                    value={editingVendor ? editingVendor.notes : newVendor.notes}
                    onChange={(e) => {
                        if (editingVendor) {
                            setEditingVendor({ ...editingVendor, notes: e.target.value });
                        } else {
                            setNewVendor({ ...newVendor, notes: e.target.value });
                        }
                    }}
                ></textarea>
            </div>
            {/* Contact Preferences */}
            <div>
                <label htmlFor="contactPreferences" className="block text-sm font-medium text-gray-700">Contact Preferences</label>
                <textarea
                    id="contactPreferences"
                    rows="3"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                    value={editingVendor ? editingVendor.contact_preferences : newVendor.contact_preferences}
                    onChange={(e) => {
                        if (editingVendor) {
                            setEditingVendor({ ...editingVendor, contact_preferences: e.target.value });
                        } else {
                            setNewVendor({ ...newVendor, contact_preferences: e.target.value });
                        }
                    }}
                ></textarea>
            </div>
            {/* Process Notes */}
            <div>
                <label htmlFor="processNotes" className="block text-sm font-medium text-gray-700">Process Notes</label>
                <textarea
                    id="processNotes"
                    rows="3"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                    value={editingVendor ? editingVendor.process_notes : newVendor.process_notes}
                    onChange={(e) => {
                        if (editingVendor) {
                            setEditingVendor({ ...editingVendor, process_notes: e.target.value });
                        } else {
                            setNewVendor({ ...newVendor, process_notes: e.target.value });
                        }
                    }}
                ></textarea>
            </div>
            <div className="flex justify-between space-x-4">
                <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                    disabled={loading}
                >
                    {loading ? (editingVendor ? 'Updating...' : 'Adding...') : (editingVendor ? 'Update Vendor' : 'Add Vendor')}
                </button>
                {editingVendor && (
                    <button
                        type="button"
                        onClick={() => {
                            setEditingVendor(null); // Cancel editing
                            setNewVendor({ // Reset newVendor form if it was partially filled
                                name: '', address: '', city: '', state: '', zip_code: '',
                                phone: '', email: '', website: '', notes: '',
                                contact_preferences: '', process_notes: ''
                            });
                            setCurrentPage('viewVendors'); // Go back to view
                        }}
                        className="w-full bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                        disabled={loading}
                    >
                        Cancel Edit
                    </button>
                )}
            </div>
        </form>
    </div>
);

    const renderAddProduct = () => (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h2>
            <form onSubmit={editingProduct ? async (e) => {
                e.preventDefault();
                setLoading(true);
                try {
                    const { data, error } = await supabaseClientInstance
                        .from('products')
                        .update(editingProduct)
                        .eq('id', editingProduct.id)
                        .select();
                    if (error) throw error;
                    setProducts(prev => prev.map(p => p.id === data[0].id ? data[0] : p));
                    setEditingProduct(null);
                    setCurrentPage('viewProducts');
                    showMessage('Product updated successfully!', 'success');
                } catch (error) {
                    console.error("Error updating product:", error.message);
                    showMessage(`Failed to update product: ${error.message}`, 'error');
                } finally {
                    setLoading(false);
                }
            } : handleAddProduct} className="space-y-4">
                <div>
                    <label htmlFor="productName" className="block text-sm font-medium text-gray-700">Product Name <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        id="productName"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                        value={editingProduct ? editingProduct.name : newProduct.name}
                        onChange={(e) => {
                            if (editingProduct) {
                                setEditingProduct({ ...editingProduct, name: e.target.value });
                            } else {
                                setNewProduct({ ...newProduct, name: e.target.value });
                            }
                        }}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="productType" className="block text-sm font-medium text-gray-700">Product Type</label>
                    <input
                        type="text"
                        id="productType"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                        value={editingProduct ? editingProduct.type : newProduct.type}
                        onChange={(e) => {
                            if (editingProduct) {
                                setEditingProduct({ ...editingProduct, type: e.target.value });
                            } else {
                                setNewProduct({ ...newProduct, type: e.target.value });
                            }
                        }}
                        placeholder="e.g., Software, Hardware, Service"
                    />
                </div>
                <div>
                    <label htmlFor="productDescription" className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                        id="productDescription"
                        rows="3"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                        value={editingProduct ? editingProduct.description : newProduct.description}
                        onChange={(e) => {
                            if (editingProduct) {
                                setEditingProduct({ ...editingProduct, description: e.target.value });
                            } else {
                                setNewProduct({ ...newProduct, description: e.target.value });
                            }
                        }}
                    ></textarea>
                </div>
                <div className="flex justify-between space-x-4">
                    <button
                        type="submit"
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                        disabled={loading}
                    >
                        {loading ? (editingProduct ? 'Updating...' : 'Adding...') : (editingProduct ? 'Update Product' : 'Add Product')}
                    </button>
                    {editingProduct && (
                        <button
                            type="button"
                            onClick={() => {
                                setEditingProduct(null);
                                setNewProduct({ name: '', type: '', description: '' });
                                setCurrentPage('viewProducts');
                            }}
                            className="w-full bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                            disabled={loading}
                        >
                            Cancel Edit
                        </button>
                    )}
                </div>
            </form>
        </div>
    );

    const renderAddRepresentative = () => (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                {editingRepresentative ? 'Edit Representative' : 'Add New Representative'}
            </h2>
            <form onSubmit={editingRepresentative ? async (e) => {
                e.preventDefault();
                setLoading(true);
                try {
                    const { data, error } = await supabaseClientInstance
                        .from('representatives')
                        .update(editingRepresentative)
                        .eq('id', editingRepresentative.id)
                        .select();
                    if (error) throw error;
                    fetchRepresentatives(); // Re-fetch to get updated vendor name
                    setEditingRepresentative(null);
                    setCurrentPage('viewRepresentatives');
                    showMessage('Representative updated successfully!', 'success');
                } catch (error) {
                    console.error("Error updating representative:", error.message);
                    showMessage(`Failed to update representative: ${error.message}`, 'error');
                } finally {
                    setLoading(false);
                }
            } : handleAddRepresentative} className="space-y-4">
                <div>
                    <label htmlFor="selectVendor" className="block text-sm font-medium text-gray-700">Select Vendor <span className="text-red-500">*</span></label>
                    <select
                        id="selectVendor"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                        value={editingRepresentative ? editingRepresentative.vendor_id : selectedVendorForRep}
                        onChange={(e) => {
                            if (editingRepresentative) {
                                setEditingRepresentative({ ...editingRepresentative, vendor_id: e.target.value });
                            } else {
                                setSelectedVendorForRep(e.target.value);
                            }
                        }}
                        required
                        disabled={!!editingRepresentative} // Disable if editing, as vendor_id shouldn't change for existing rep
                    >
                        <option value="">-- Select a Vendor --</option>
                        {vendors.map(vendor => (
                            <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="repName" className="block text-sm font-medium text-gray-700">Representative Name <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        id="repName"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                        value={editingRepresentative ? editingRepresentative.name : newRepresentative.name}
                        onChange={(e) => {
                            if (editingRepresentative) {
                                setEditingRepresentative({ ...editingRepresentative, name: e.target.value });
                            } else {
                                setNewRepresentative({ ...newRepresentative, name: e.target.value });
                            }
                        }}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="repEmail" className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                        type="email"
                        id="repEmail"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                        value={editingRepresentative ? editingRepresentative.email : newRepresentative.email}
                        onChange={(e) => {
                            if (editingRepresentative) {
                                setEditingRepresentative({ ...editingRepresentative, email: e.target.value });
                            } else {
                                setNewRepresentative({ ...newRepresentative, email: e.target.value });
                            }
                        }}
                    />
                </div>
                <div>
                    <label htmlFor="repPhone" className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                        type="tel"
                        id="repPhone"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                        value={editingRepresentative ? editingRepresentative.phone : newRepresentative.phone}
                        onChange={(e) => {
                            if (editingRepresentative) {
                                setEditingRepresentative({ ...editingRepresentative, phone: e.target.value });
                            } else {
                                setNewRepresentative({ ...newRepresentative, phone: e.target.value });
                            }
                        }}
                    />
                </div>
                <div>
                    <label htmlFor="repTitle" className="block text-sm font-medium text-gray-700">Title</label>
                    <input
                        type="text"
                        id="repTitle"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                        value={editingRepresentative ? editingRepresentative.title : newRepresentative.title}
                        onChange={(e) => {
                            if (editingRepresentative) {
                                setEditingRepresentative({ ...editingRepresentative, title: e.target.value });
                            } else {
                                setNewRepresentative({ ...newRepresentative, title: e.target.value });
                            }
                        }}
                    />
                </div>
                <div className="flex justify-between space-x-4">
                    <button
                        type="submit"
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                        disabled={loading}
                    >
                        {loading ? (editingRepresentative ? 'Updating...' : 'Adding...') : (editingRepresentative ? 'Update Representative' : 'Add Representative')}
                    </button>
                    {editingRepresentative && (
                        <button
                            type="button"
                            onClick={() => {
                                setEditingRepresentative(null);
                                setNewRepresentative({ vendor_id: '', name: '', email: '', phone: '', title: '' });
                                setSelectedVendorForRep('');
                                setCurrentPage('viewRepresentatives');
                            }}
                            className="w-full bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                            disabled={loading}
                        >
                            Cancel Edit
                        </button>
                    )}
                </div>
            </form>
        </div>
    );

    const renderSearch = () => (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Search Database</h2>
            <form onSubmit={handleSearch} className="space-y-4 mb-6">
                <div>
                    <label htmlFor="searchType" className="block text-sm font-medium text-gray-700">Search By:</label>
                    <select
                        id="searchType"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                        value={searchType}
                        onChange={(e) => {
                            setSearchType(e.target.value);
                            setSearchTerm('');
                            setSelectedProductIdForSearch('');
                            setSearchResults([]);
                        }}
                    >
                        <option value="vendorName">Vendor Name</option>
                        <option value="productName">Product Name</option>
                        <option value="productType">Product Type</option>
                        <option value="vendorsByProduct">Vendors by Specific Product</option>
                    </select>
                </div>

                {searchType !== 'vendorsByProduct' && (
                    <div>
                        <label htmlFor="searchTerm" className="block text-sm font-medium text-gray-700">Search Term:</label>
                        <input
                            type="text"
                            id="searchTerm"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={`Enter ${searchType.replace('Name', ' Name').replace('Type', ' Type').toLowerCase()}`}
                            required
                        />
                    </div>
                )}

                {searchType === 'vendorsByProduct' && (
                    <div>
                        <label htmlFor="selectProductForSearch" className="block text-sm font-medium text-gray-700">Select Product:</label>
                        <select
                            id="selectProductForSearch"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                            value={selectedProductIdForSearch}
                            onChange={(e) => setSelectedProductIdForSearch(e.target.value)}
                            required
                        >
                            <option value="">-- Select a Product --</option>
                            {products.map(product => (
                                <option key={product.id} value={product.id}>{product.name} ({product.type || 'N/A'})</option>
                            ))}
                        </select>
                    </div>
                )}

                <button
                    type="submit"
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                    disabled={loading || (searchType !== 'vendorsByProduct' && !searchTerm) || (searchType === 'vendorsByProduct' && !selectedProductIdForSearch)}
                >
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </form>

            {searchResults.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Search Results ({searchResults.length})</h3>
                    <div>
                        <button
                            onClick={handlePrint}
                            className="mb-4 bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 mr-2"
                        >
                            Print Results
                        </button>
                        <button
                            onClick={() => {
                                let headers;
                                let dataToExport;
                                if (searchType === 'vendorName' || searchType === 'vendorsByProduct') {
                                    headers = ['name', 'email', 'phone', 'productName']; // productName is only for vendorsByProduct
                                    dataToExport = searchResults;
                                } else {
                                    headers = ['name', 'type', 'description'];
                                    dataToExport = searchResults;
                                }
                                exportToCsv(dataToExport, headers, 'search_results.csv');
                            }}
                            className="mb-4 bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                        >
                            Export as CSV
                        </button>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {searchType === 'vendorName' || searchType === 'vendorsByProduct' ? (
                                        <>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                            {searchType === 'vendorsByProduct' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Sold</th>}
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {searchResults.map((result, idx) => (
                                    <tr key={result.id || idx} className="hover:bg-gray-50">
                                        {searchType === 'vendorName' || searchType === 'vendorsByProduct' ? (
                                            <>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.email}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.phone}</td>
                                                {searchType === 'vendorsByProduct' && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.productName}</td>}
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.type || 'N/A'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs overflow-hidden text-ellipsis">{result.description || 'No description'}</td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {searchResults.length === 0 && searchTerm && !loading && (
                <p className="mt-4 text-gray-600">No results found for your search.</p>
            )}
        </div>
    );

    const renderVendorDetails = () => {
        if (!selectedVendorForDetails) {
            return (
                <div className="p-6 bg-white rounded-lg shadow-md text-gray-600">
                    No vendor selected for details. Please go back to "View Vendors" and select one.
                </div>
            );
        }

        return (
            <div className="p-6 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                    Details for: {selectedVendorForDetails.name}
                </h2>
                <button
                    onClick={() => {
                        setCurrentPage('viewVendors'); // Go back to the vendor list
                        setSelectedVendorForDetails(null); // Clear selected vendor details
                    }}
                    className="mb-4 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                >
                    ← Back to Vendors
                </button>
                <div className="mb-4">
                    <button
                        onClick={() => {
                            const vendorData = [{ // Create a single-row array for the vendor
                                name: selectedVendorForDetails.name,
                                email: selectedVendorForDetails.email,
                                phone: selectedVendorForDetails.phone,
                                website: selectedVendorForDetails.website,
                                contact_preferences: selectedVendorForDetails.contact_preferences,
                                process_notes: selectedVendorForDetails.process_notes,
                                address: `${selectedVendorForDetails.address || ''}, ${selectedVendorForDetails.city || ''}, ${selectedVendorForDetails.state || ''} ${selectedVendorForDetails.zip_code || ''}`,
                            }];
                            exportToCsv(vendorData, ['name', 'email', 'phone', 'website', 'contact_preferences', 'process_notes', 'address'], `${selectedVendorForDetails.name}_details.csv`);
                        }}
                        className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 mr-2"
                    >
                        Export Vendor Info as CSV
                    </button>
                    <button
                        onClick={() => exportToCsv(vendorDetailReps, ['name', 'email', 'phone', 'title'], `${selectedVendorForDetails.name}_reps.csv`)}
                        className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 mr-2"
                    >
                        Export Reps as CSV
                    </button>
                    <button
                        onClick={() => exportToCsv(vendorDetailProducts, ['name', 'type', 'description'], `${selectedVendorForDetails.name}_products.csv`)}
                        className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                    >
                        Export Products as CSV
                    </button>
                </div>

                {loadingVendorDetails ? (
                    <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mr-3"></div>
                        <p className="text-gray-700">Loading vendor details...</p>
                    </div>
                ) : vendorDetailsError ? (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4" role="alert">
                        Error: {vendorDetailsError}
                    </div>
                ) : (
                    <>
                        {/* Vendor Basic Info */}
                        <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <h3 className="text-xl font-semibold text-gray-800 mb-3">Vendor Information</h3>
                            <p><strong className="font-medium">Name:</strong> {selectedVendorForDetails.name}</p>
                            <p><strong className="font-medium">Email:</strong> {selectedVendorForDetails.email}</p>
                            <p><strong className="font-medium">Phone:</strong> {selectedVendorForDetails.phone}</p>
                            <p><strong className="font-medium">Website:</strong> <a href={selectedVendorForDetails.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{selectedVendorForDetails.website}</a></p>
                            <p><strong className="font-medium">Address:</strong> {`${selectedVendorForDetails.address || ''}, ${selectedVendorForDetails.city || ''}, ${selectedVendorForDetails.state || ''} ${selectedVendorForDetails.zip_code || ''}`}</p>
                            <p><strong className="font-medium">Contact Preferences:</strong> {selectedVendorForDetails.contact_preferences || 'N/A'}</p>
                            <p><strong className="font-medium">Process Notes:</strong> {selectedVendorForDetails.notes || 'N/A'}</p>
                            <p><strong className="font-medium">General Notes:</strong> {selectedVendorForDetails.notes || 'N/A'}</p>
                        </div>

                        {/* Representatives Section */}
                        <div className="mb-8">
                            <h3 className="text-xl font-semibold text-gray-800 mb-3">Associated Representatives ({vendorDetailReps.length})</h3>
                            {vendorDetailReps.length === 0 ? (
                                <p className="text-gray-600">No representatives found for this vendor.</p>
                            ) : (
                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {vendorDetailReps.map(rep => (
                                                <tr key={rep.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{rep.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rep.email}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rep.phone}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rep.title || 'N/A'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Products Section */}
                        <div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-3">Offered Products ({vendorDetailProducts.length})</h3>
                            {vendorDetailProducts.length === 0 ? (
                                <p className="text-gray-600">No products found for this vendor.</p>
                            ) : (
                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {vendorDetailProducts.map(product => (
                                                <tr key={product.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.type || 'N/A'}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs overflow-hidden text-ellipsis">{product.description || 'No description'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    };


    // --- Main App Render ---
    if (loading || !isAuthReady) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-center text-gray-700">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p>Loading application and authenticating with Supabase...</p>
                </div>
            </div>
        );
    }

    // If not logged in, show auth forms
    if (!userId) {
        // Render the AuthForms component, passing necessary props
        return (
            <AuthForms
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                isLoginMode={isLoginMode}
                setIsLoginMode={setIsLoginMode}
                handleAuthSubmit={handleAuthSubmit}
                loading={loading}
                errorMessage={errorMessage}
                successMessage={successMessage}
                setErrorMessage={setErrorMessage} // Passed here
                setSuccessMessage={setSuccessMessage} // Passed here
            />
        );
    }

    // If logged in, show the main portal
    return (
        <div className="min-h-screen bg-gray-100 font-sans text-gray-900">
            {/* Tailwind CSS CDN */}
            <script src="https://cdn.tailwindcss.com"></script>
            {/* Inter Font */}
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
            <style>
                {`
                body {
                    font-family: 'Inter', sans-serif;
                }
                .rounded-full {
                    border-radius: 9999px;
                }
                .shadow-lg {
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                }
                .transition {
                    transition-property: all;
                    transition-duration: 300ms;
                    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
                }
                .transform {
                    transform: var(--tw-transform);
                }
                .hover\\:scale-105:hover {
                    --tw-scale-x: 1.05;
                    --tw-scale-y: 1.05;
                    transform: var(--tw-transform);
                }
                /* Print styles */
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .printable-area, .printable-area * {
                        visibility: visible;
                    }
                    .printable-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        padding: 20px; /* Add some padding for print */
                        box-sizing: border-box;
                    }
                    .printable-area table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 20px;
                    }
                    .printable-area th, .printable-area td {
                        border: 1px solid #ddd;
                        padding: 8px;
                        text-align: left;
                        white-space: normal !important; /* Allow text to wrap */
                        overflow: visible !important;
                        text-overflow: clip !important;
                    }
                    .printable-area th {
                        background-color: #f2f2f2;
                    }
                    /* Hide navigation and buttons in print */
                    nav, button, form {
                        display: none !important;
                    }
                    /* Ensure tables are fully visible */
                    table {
                        width: 100% !important;
                        table-layout: auto; /* Allow table to adjust column widths */
                    }
                }
                `}
            </style>

            {/* Header */}
            <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md py-4 px-6 rounded-b-lg">
                <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
                    <h1 className="text-3xl font-bold mb-2 md:mb-0">Vendor Portal</h1>
                    {userId && (
                        <p className="text-sm opacity-80">Logged in as: {userId.substring(0, 8)}... <button onClick={handleSignOut} className="ml-2 text-blue-200 hover:text-white hover:underline">Logout</button></p>
                    )}
                </div>
            </header>

            {/* Navigation */}
            <nav className="bg-white shadow-sm py-3 px-6 sticky top-0 z-10 rounded-b-lg">
                <div className="container mx-auto flex flex-wrap justify-center gap-2 md:gap-4 text-sm md:text-base">
                    <button
                        onClick={() => {
                            setCurrentPage('dashboard');
                            setEditingVendor(null); // Clear editing state on navigation
                            setEditingProduct(null);
                            setEditingRepresentative(null);
                            setSelectedVendorForDetails(null); // Clear details view
                        }}
                        className={`px-4 py-2 rounded-full font-medium ${currentPage === 'dashboard' ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:bg-gray-200'}`}
                    >
                        Dashboard
                    </button>
                    <button
                        onClick={() => {
                            setCurrentPage('viewVendors');
                            setEditingVendor(null);
                            setSelectedVendorForDetails(null); // Clear details view
                        }}
                        className={`px-4 py-2 rounded-full font-medium ${currentPage === 'viewVendors' ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:bg-gray-200'}`}
                    >
                        View Vendors
                    </button>
                    <button
                        onClick={() => {
                            setCurrentPage('viewProducts');
                            setEditingProduct(null);
                            setSelectedVendorForDetails(null); // Clear details view
                        }}
                        className={`px-4 py-2 rounded-full font-medium ${currentPage === 'viewProducts' ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:bg-gray-200'}`}
                    >
                        View Products
                    </button>
                    <button
                        onClick={() => {
                            setCurrentPage('viewRepresentatives');
                            setEditingRepresentative(null);
                            setSelectedVendorForDetails(null); // Clear details view
                        }}
                        className={`px-4 py-2 rounded-full font-medium ${currentPage === 'viewRepresentatives' ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:bg-gray-200'}`}
                    >
                        View Representatives
                    </button>
                    <button
                        onClick={() => {
                            setCurrentPage('addVendor');
                            setEditingVendor(null); // Ensure form is for adding, not editing
                            setNewVendor({ // Reset form fields
                                name: '', address: '', city: '', state: '', zip_code: '',
                                phone: '', email: '', website: '', notes: '',
                                contact_preferences: '', process_notes: ''
                            });
                            setSelectedVendorForDetails(null); // Clear details view
                        }}
                        className={`px-4 py-2 rounded-full font-medium ${currentPage === 'addVendor' && !editingVendor ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:bg-gray-200'}`}
                    >
                        Add Vendor
                    </button>
                    <button
                        onClick={() => {
                            setCurrentPage('addProduct');
                            setEditingProduct(null); // Ensure form is for adding
                            setNewProduct({ name: '', type: '', description: '' });
                            setSelectedVendorForDetails(null); // Clear details view
                        }}
                        className={`px-4 py-2 rounded-full font-medium ${currentPage === 'addProduct' && !editingProduct ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:bg-gray-200'}`}
                    >
                        Add Product
                    </button>
                    <button
                        onClick={() => {
                            setCurrentPage('addRepresentative');
                            setEditingRepresentative(null); // Ensure form is for adding
                            setNewRepresentative({ vendor_id: '', name: '', email: '', phone: '', title: '' });
                            setSelectedVendorForRep('');
                            setSelectedVendorForDetails(null); // Clear details view
                        }}
                        className={`px-4 py-2 rounded-full font-medium ${currentPage === 'addRepresentative' && !editingRepresentative ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:bg-gray-200'}`}
                    >
                        Add Representative
                    </button>
                    <button
                        onClick={() => {
                            setCurrentPage('search');
                            setEditingVendor(null); // Clear editing state on navigation
                            setEditingProduct(null);
                            setEditingRepresentative(null);
                            setSelectedVendorForDetails(null); // Clear details view
                        }}
                        className={`px-4 py-2 rounded-full font-medium ${currentPage === 'search' ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:bg-gray-200'}`}
                    >
                        Search
                    </button>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="container mx-auto p-4 md:p-6 mt-6">
                {errorMessage && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4" role="alert">
                        <strong className="font-bold">Error!</strong>
                        <span className="block sm:inline"> {errorMessage}</span>
                    </div>
                )}
                {successMessage && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md relative mb-4" role="alert">
                        <strong className="font-bold">Success!</strong>
                        <span className="block sm:inline"> {successMessage}</span>
                    </div>
                )}

                {/* Render content based on currentPage state */}
                <div className="printable-area">
                    {(() => {
                        switch (currentPage) {
                            case 'dashboard':
                                return renderDashboard();
                            case 'viewVendors':
                                return renderViewVendors();
                            case 'viewProducts':
                                return renderViewProducts();
                            case 'viewRepresentatives':
                                return renderViewRepresentatives();
                            case 'addVendor':
                                return renderAddVendor();
                            case 'addProduct':
                                return renderAddProduct();
                            case 'addRepresentative':
                                return renderAddRepresentative();
                            case 'search':
                                return renderSearch();
                            case 'viewVendorDetails':
                                return renderVendorDetails(); // New case for vendor details
                            default:
                                return renderDashboard();
                        }
                    })()}
                </div>
            </main>

            {/* Custom Modal Component */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            {modalIsConfirm ? 'Confirm Action' : 'Notification'}
                        </h3>
                        <p className="text-gray-700 mb-6">{modalMessage}</p>
                        <div className="flex justify-end space-x-3">
                            {modalIsConfirm && (
                                <>
                                    <button
                                        onClick={closeCustomModal}
                                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleModalConfirm}
                                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out"
                                    >
                                        Confirm
                                    </button>
                                </>
                            )}
                            {!modalIsConfirm && (
                                <button
                                    onClick={closeCustomModal}
                                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out"
                                >
                                    OK
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;

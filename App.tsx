import React, { useState, useEffect, useRef } from 'react';

import type { ViewState, ValidationReport, UserProfile } from './types';

import { MOCK_REPORT } from './types';

import { validateIdea } from './services/geminiService';

import { api } from './services/api'; 

import { MarketingLandingView } from './views/MarketingLandingView';

import { InputView } from './views/InputView';

import { LoadingView } from './views/LoadingView';

import { ReportView } from './views/ReportView';

import { HistoryView } from './views/HistoryView';

import { CustomApiKeysView } from './views/CustomApiKeysView';

import { PricingView } from './views/PricingView';

import { SettingsView } from './views/SettingsView';

import { AuthView } from './views/AuthView';

import { DashboardView } from './views/DashboardView';

import { HelpView } from './views/HelpView';

import { ChatView } from './views/ChatView';

import { PurchaseSuccessView } from './views/PurchaseSuccessView';

import { PrivacyView } from './views/PrivacyView';

import { TermsView } from './views/TermsView';

import { Footer } from './components/Footer';

import { ErrorBoundary } from './components/ErrorBoundary';

import { AlertCircle, History, Settings, HelpCircle, LogIn, LayoutDashboard, LogOut, ChevronDown, Loader2 } from 'lucide-react';

import { Button } from './components/Button';



export const App: React.FC = () => {

  // --- User State ---

  const [user, setUser] = useState<UserProfile | null>(() => {

    try {

      const saved = localStorage.getItem('Greenli8_user');

      return saved ? JSON.parse(saved) : null;

    } catch { return null; }

  });



  const [currentView, setCurrentView] = useState<ViewState>(() => {

    // Check URL params for overrides

    const params = new URLSearchParams(window.location.search);

    if (params.get('mode') === 'waitlist') return 'marketing';

    if (params.get('mode') === 'app') return localStorage.getItem('Greenli8_user') ? 'dashboard' : 'auth';



    // Check environment variable (set VITE_ENABLE_MARKETING_PAGE=true in Production)

    // if (import.meta.env.VITE_ENABLE_MARKETING_PAGE === 'true' && !localStorage.getItem('Greenli8_user')) {

    //     return 'marketing';

    // }



    if (localStorage.getItem('Greenli8_user')) return 'dashboard';

    

    // Default to Marketing/Waitlist page for visitors

    return 'marketing';

  });



  // --- Data State ---

  const [report, setReport] = useState<ValidationReport | null>(null);

  const [originalIdea, setOriginalIdea] = useState<string>(''); 

  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<ValidationReport[]>([]);

  

  const [credits, setCredits] = useState<number>(user?.credits || 20);

  const [isLifetime, setIsLifetime] = useState<boolean>(user?.isPro || false);



  // --- UI State ---

  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  const [purchasedPlan, setPurchasedPlan] = useState<'single' | 'lifetime' | 'maker' | 'pro' | null>(null);

  

  const dropdownRef = useRef<HTMLDivElement>(null);



  // --- Effects ---



  // 1. Load Data on Mount / User Change

  useEffect(() => {

    const loadData = async () => {

      // Local Storage Load (Guest)

      if (!user) {

        try {

          const savedHistory = localStorage.getItem('Greenli8_history');

          if (savedHistory) setHistory(JSON.parse(savedHistory));

          

          const savedCredits = localStorage.getItem('Greenli8_credits');

          if (savedCredits) setCredits(parseInt(savedCredits));

          

          const savedLifetime = localStorage.getItem('Greenli8_lifetime');

          if (savedLifetime === 'true') setIsLifetime(true);

        } catch (e) { console.error(e); }

        return;

      }



      // API Load (Authenticated)

      try {

        const token = localStorage.getItem('Greenli8_token');

        if (!token) {

          console.warn("User state exists but token is missing, forcing logout");

          handleLogout();

          return;

        }



        const dbHistory = await api.getHistory();

        setHistory(dbHistory);

        

        // Refresh user details to get accurate credits from DB

        const dbUser = await api.getCurrentUser(); 

        setUser(dbUser);

        setCredits(dbUser.credits);

        setIsLifetime(dbUser.isPro);

      } catch (e: any) {

        console.error("Failed to sync with backend", e);

        // If auth fails (401 or 403), clear local state and force logout

        const errorMessage = e.message?.toLowerCase() || "";

        if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('token')) {

          handleLogout();

        }

      }

    };



    loadData();

  }, [user]); 



  // 2. Click Outside Dropdown

  useEffect(() => {

    function handleClickOutside(event: MouseEvent) {

      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {

        setUserMenuOpen(false);

      }

    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);

  }, []);



  // 3. Payment Verification

  useEffect(() => {

    const params = new URLSearchParams(window.location.search);

    const sessionId = params.get('session_id');



    if (sessionId) {

        verifyBackendPayment(sessionId);

    }

  }, []);



  // --- Handlers ---



  const verifyBackendPayment = async (sessionId: string) => {

    setIsVerifyingPayment(true);

    try {

        const response = await api.verifyPayment(sessionId);

        if (!response.ok) throw new Error(`Server returned ${response.status}`);

        

        const data = await response.json();



        if (data.verified) {

            window.history.replaceState({}, '', window.location.pathname);

            

            if (user && data.customer_email === user.email) {

                 if (data.plan === 'lifetime') {

                     handleUpdateProfile({ isPro: true });

                 } else {

                     handleUpdateProfile({ credits: credits + 1 });

                 }

            }

            

            handlePaymentSuccess(data.plan);

        } else {

            alert(`Payment not confirmed. Status: ${data.status || 'unknown'}`);

        }

    } catch (e) {

        console.error("Payment verification error:", e);

        alert("Connection error. Please check console.");

    } finally {

        setIsVerifyingPayment(false);

    }

  };



  const handlePaymentSuccess = (planType: string) => {

    const plan = planType === 'lifetime' ? 'lifetime' : 'single';

    

    if (plan === 'lifetime') {

        setIsLifetime(true);

        if (!user) localStorage.setItem('Greenli8_lifetime', 'true');

    } else {

        const newCredits = credits + 1;

        setCredits(newCredits);

        if (!user) localStorage.setItem('Greenli8_credits', newCredits.toString());

    }

    

    setPurchasedPlan(plan);

    setCurrentView('purchase_success');

  };



  const handleLogin = async (userData: UserProfile) => {

    try {

      setUser(userData);

      setCredits(userData.credits);

      setIsLifetime(userData.isPro);

      localStorage.setItem('Greenli8_user', JSON.stringify(userData));

      

      // No need to load history here, the useEffect[user] will trigger it

      setCurrentView('dashboard');

    } catch (e) {

      console.error("Login state update failed", e);

    }

  };



  const handleLogout = () => {

    setUser(null);

    api.logout(); // Use service to clear token

    localStorage.removeItem('Greenli8_user');

    setCurrentView('marketing');

  };



  const handleUpdateProfile = async (data: Partial<UserProfile>) => {

    if (!user) return;

    

    const oldUser = user;



    // Optimistic update

    setUser(prevUser => {

      if (!prevUser) return null;

      const updated = { ...prevUser, ...data };

      localStorage.setItem('Greenli8_user', JSON.stringify(updated));

      return updated;

    });

    

    try {

      await api.updateProfile(data);

    } catch (e) {

      console.error("Failed to sync profile update", e);

      // Rollback on failure

      setUser(oldUser);

      localStorage.setItem('Greenli8_user', JSON.stringify(oldUser));

    }

  };



  const handleDeleteData = async () => {

    if (user) {

        try {

            await api.deleteAccount();

        } catch (e) {

            alert("Failed to delete account on server.");

            return;

        }

    }

    

    const keysToRemove = ['Greenli8_user', 'Greenli8_history', 'Greenli8_credits', 'Greenli8_lifetime'];

    keysToRemove.forEach(key => localStorage.removeItem(key));

    

    setHistory([]);

    setCredits(20);

    setIsLifetime(false);

    setUser(null);

    setCurrentView('marketing');

  };



  const handleStart = () => {

    if (!user) {

        setCurrentView('auth');

        return;

    }



    if (!isLifetime && credits <= 0) {

        setCurrentView('pricing');

        return;

    }

    setError(null);

    setCurrentView('input');

  };



  const handleExample = () => {

    setReport(MOCK_REPORT);

    setOriginalIdea(MOCK_REPORT.originalIdea || "");

    setCurrentView('report');

  };



  const handleSubmitIdea = async (idea: string, attachment?: { mimeType: string, data: string }, preferredModel?: string) => {

    setCurrentView('loading');

    setError(null);

    setOriginalIdea(idea);

    

    try {

      // Pass user email to secure backend to enforce server-side credit check

      const result = await validateIdea(idea, attachment, user?.email, preferredModel);

      

      const finalReport: ValidationReport = {

          ...result,

          id: result.id || crypto.randomUUID(),

          createdAt: result.createdAt || Date.now(),

          originalIdea: idea 

      };



      setReport(finalReport);

      setHistory([finalReport, ...history]);

      

      if (user) {

         // Update local credits from server response

         if (result.remainingCredits !== undefined) {

             const newCredits = result.remainingCredits === 'unlimited' ? credits : result.remainingCredits;

             setCredits(newCredits);

             const updatedUser = { ...user, credits: newCredits };

             setUser(updatedUser);

             localStorage.setItem('Greenli8_user', JSON.stringify(updatedUser));

         }

      } else {

          // Guest Logic (Local Storage)

          const guestHistory = [finalReport, ...history];

          localStorage.setItem('Greenli8_history', JSON.stringify(guestHistory));

          

          if (!isLifetime) {

              const newCredits = credits - 1;

              setCredits(newCredits);

              localStorage.setItem('Greenli8_credits', newCredits.toString());

          }

      }



      setCurrentView('report');

    } catch (e: any) {

      console.error(e);

      let errorMessage = e.message || "Something went wrong.";

      if (errorMessage.includes("API Key is missing")) {

        errorMessage = "Configuration Error: API Key missing.";

      }

      if (errorMessage.includes("Insufficient credits")) {

        errorMessage = "You have run out of credits. Please purchase more to continue.";

      }

      setError(errorMessage);

      setCurrentView('error');

    }

  };



  const handleSimulatedPurchase = async (plan: 'single' | 'lifetime' | 'maker' | 'pro') => {

      if (plan === 'single') {

          const newCredits = credits + 1;

          setCredits(newCredits);

          if (user) handleUpdateProfile({ credits: newCredits });

          else localStorage.setItem('Greenli8_credits', newCredits.toString());

      } else if (plan === 'maker') {

          const newCredits = credits + 10;

          setCredits(newCredits);

          if (user) handleUpdateProfile({ credits: newCredits });

          else localStorage.setItem('Greenli8_credits', newCredits.toString());

      } else {

          // lifetime or pro

          setIsLifetime(true);

          if (user) handleUpdateProfile({ isPro: true });

          else localStorage.setItem('Greenli8_lifetime', 'true');

      }

      setPurchasedPlan(plan);

      setCurrentView('purchase_success');

  };



  const handleNavClick = (view: ViewState) => {

    setCurrentView(view);

    setUserMenuOpen(false);

  };



  const loadReport = (r: ValidationReport) => {

      setReport(r);

      setOriginalIdea(r.originalIdea || "Context missing.");

      setCurrentView('report');

  };



  if (isVerifyingPayment) {

      return (

          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">

              <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center border border-slate-100">

                  <div className="bg-blue-50 p-4 rounded-full mb-4">

                     <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />

                  </div>

                  <h2 className="text-xl font-bold text-slate-900">Verifying Payment...</h2>

              </div>

          </div>

      );

  }



  // --- Marketing View Intercept ---

  if (currentView === 'marketing') {

      return <MarketingLandingView onGoToApp={() => setCurrentView('auth')} />;

  }



  return (

    <ErrorBoundary>

      <div className="min-h-screen font-sans text-slate-900 flex flex-col">

      {currentView !== 'auth' && currentView !== 'chat' && (

        <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">

          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setCurrentView(user ? 'dashboard' : 'marketing')}>

              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center group-hover:bg-slate-800 transition-colors">

                <span className="text-white font-bold text-lg">V</span>

              </div>

              <span className="font-bold text-lg tracking-tight hidden sm:block">Greenli8</span>

            </div>

            

            <div className="flex items-center gap-3 sm:gap-4">

                {user && (

                  <div 

                      className={`flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium cursor-pointer transition-colors ${

                          isLifetime ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'

                      }`}

                      onClick={() => setCurrentView('pricing')}

                  >

                      {isLifetime ? (

                          <span className="font-bold tracking-wide">LIFETIME</span>

                      ) : (

                          <span>{credits} Credits</span>

                      )}

                  </div>

                )}



                {user ? (

                    <>

                        <button 

                          onClick={() => setCurrentView('dashboard')}

                          className={`hidden md:block text-sm font-medium transition-colors ${currentView === 'dashboard' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}

                        >

                          Dashboard

                        </button>

                        <button 

                          onClick={() => setCurrentView('history')}

                          className={`hidden md:block text-sm font-medium transition-colors ${currentView === 'history' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}

                        >

                          History

                        </button>

                        <div className="relative" ref={dropdownRef}>

                          <button 

                              onClick={() => setUserMenuOpen(!userMenuOpen)}

                              className="flex items-center gap-2 pl-1 pr-1 py-1 rounded-full hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-100"

                          >

                              <div className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm">

                                  {user.name.charAt(0).toUpperCase()}

                              </div>

                              <ChevronDown size={14} className={`text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />

                          </button>

                          {userMenuOpen && (

                              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in-up origin-top-right">

                                  <div className="px-4 py-2 border-b border-slate-50 mb-1">

                                      <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>

                                      <p className="text-xs text-slate-500 truncate">{user.email}</p>

                                  </div>

                                  <button onClick={() => handleNavClick('dashboard')} className="md:hidden w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">

                                      <LayoutDashboard size={16} /> Dashboard

                                  </button>

                                  <button onClick={() => handleNavClick('history')} className="md:hidden w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">

                                      <History size={16} /> History

                                  </button>

                                  <button onClick={() => handleNavClick('settings')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">

                                      <Settings size={16} /> Settings

                                  </button>

                                  <button onClick={() => handleNavClick('help')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">

                                      <HelpCircle size={16} /> Help

                                  </button>

                                  <div className="border-t border-slate-50 my-1 pt-1">

                                      <button onClick={() => { handleLogout(); setUserMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium">

                                          <LogOut size={16} /> Log Out

                                      </button>

                                  </div>

                              </div>

                          )}

                        </div>

                    </>

                ) : (

                    <>

                        <button onClick={() => setCurrentView('history')} className="p-2 text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">

                            <History size={20} />

                        </button>

                        <button onClick={() => setCurrentView('help')} className="p-2 text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">

                            <HelpCircle size={20} />

                        </button>

                        <Button size="sm" variant="outline" onClick={() => setCurrentView('auth')} className="flex gap-2 ml-2">

                          <LogIn size={16} /> <span className="hidden sm:inline">Log in</span>

                        </Button>

                    </>

                )}

            </div>

          </div>

        </nav>

      )}



      <main className={`flex-grow ${currentView === 'chat' ? 'h-screen' : 'py-8 md:py-12'}`}>

        {currentView === 'auth' && (

            <AuthView onLogin={handleLogin} onBack={() => setCurrentView('marketing')} />

        )}

        {currentView === 'dashboard' && user && (

            <DashboardView 

                user={user}

                history={history}

                onValidateNew={handleStart}

                onViewHistory={() => setCurrentView('history')}

                onViewReport={loadReport}

                onExample={handleExample}

            />

        )}

        {currentView === 'input' && (

          <InputView onBack={() => setCurrentView(user ? 'dashboard' : 'marketing')} onSubmit={handleSubmitIdea} credits={credits} isLifetime={isLifetime} />

        )}

        {currentView === 'loading' && (

          <LoadingView />

        )}

        {currentView === 'report' && report && (

          <ReportView 

            report={report} 

            onReset={() => { setReport(null); handleStart(); }} 

            onUpgrade={() => setCurrentView('pricing')} 

            onChat={() => setCurrentView('chat')}

          />

        )}

        {currentView === 'chat' && report && (

          <ChatView 

             report={report} 

             originalIdea={originalIdea}

             onBack={() => setCurrentView('report')} 

          />

        )}

        {currentView === 'history' && (

            <HistoryView 

                history={history} 

                onSelect={loadReport}

                onClear={() => handleDeleteData()} 

                onBack={() => setCurrentView(user ? 'dashboard' : 'marketing')}

            />

        )}

        {currentView === 'pricing' && (

            <PricingView onPurchase={handleSimulatedPurchase} onBack={() => setCurrentView(user ? 'dashboard' : 'marketing')} />

        )}

        {currentView === 'purchase_success' && purchasedPlan && (

            <PurchaseSuccessView plan={purchasedPlan} onContinue={() => setCurrentView('input')} />

        )}

        {currentView === 'settings' && (

            <SettingsView 

                user={user}

                history={history}

                onBack={() => setCurrentView(user ? 'dashboard' : 'marketing')}

                onDeleteData={handleDeleteData}

                onUpdateProfile={handleUpdateProfile}

                onLogout={handleLogout}

                credits={credits}

                isLifetime={isLifetime}

            />

        )}

        {currentView === 'custom_api_keys' && user && (
            <CustomApiKeysView 
                user={user}
                onBack={() => setCurrentView('settings')}
                onUpdateProfile={handleUpdateProfile}
            />
        )}

        {currentView === 'help' && (

            <HelpView onBack={() => setCurrentView(user ? 'dashboard' : 'marketing')} />

        )}

        {currentView === 'privacy' && (

            <PrivacyView onBack={() => setCurrentView('marketing')} />

        )}

        {currentView === 'terms' && (

            <TermsView onBack={() => setCurrentView('marketing')} />

        )}

        {currentView === 'error' && (

          <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">

            <div className="bg-rose-50 p-4 rounded-full mb-4">

              <AlertCircle className="w-10 h-10 text-rose-500" />

            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">Analysis Failed</h2>

            <p className="text-slate-500 max-w-md mb-8">

              {error || "We couldn't process your request at this time. Please try again."}

            </p>

            <div className="flex gap-4">

              <Button onClick={() => setCurrentView('input')}>Try Again</Button>

              <Button variant="outline" onClick={() => setCurrentView(user ? 'dashboard' : 'marketing')}>Go Home</Button>

            </div>

          </div>

        )}

      </main>



      {currentView !== 'chat' && (

        <Footer 

            onOpenPrivacy={() => setCurrentView('privacy')} 

            onOpenTerms={() => setCurrentView('terms')}

            onOpenWaitlist={() => setCurrentView('marketing')}

        />

      )}

    </div>

    </ErrorBoundary>

  );

};
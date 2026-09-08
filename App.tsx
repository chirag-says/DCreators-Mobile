import React, { useEffect } from 'react';
import { useAuthStore } from './src/store/useAuthStore';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BottomNavigation from './src/components/BottomNavigation';
import ErrorBoundary from './src/components/ErrorBoundary';
import type { RootStackParamList, MainTabParamList } from './src/types/navigation';

import AnimatedSplashScreen from './src/screens/AnimatedSplashScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import EmailLoginScreen from './src/screens/EmailLoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import IntroScreen from './src/screens/IntroScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CreatorProfileScreen from './src/screens/CreatorProfileScreen';
import CreateCreatorAccountScreen from './src/screens/CreateCreatorAccountScreen';
import AssignProjectScreen from './src/screens/AssignProjectScreen';
import SearchScreen from './src/screens/SearchScreen';
import FloatingQueryScreen from './src/screens/FloatingQueryScreen';
import ClientReviewScreen from './src/screens/ClientReviewScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import OTPVerificationScreen from './src/screens/OTPVerificationScreen';
import FilterScreen from './src/screens/FilterScreen';
import ClientWorkorderScreen from './src/screens/ClientWorkorderScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AssignMultipleScreen from './src/screens/AssignMultipleScreen';
import TermsScreen from './src/screens/TermsScreen';
import PortfolioGalleryScreen from './src/screens/PortfolioGalleryScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import ChatScreen from './src/screens/ChatScreen';
import CreatorWorkorderScreen from './src/screens/CreatorWorkorderScreen';
import AssignmentAcceptedScreen from './src/screens/AssignmentAcceptedScreen';
import AssignmentPaymentScreen from './src/screens/AssignmentPaymentScreen';
import InvoiceScreen from './src/screens/InvoiceScreen';
import SavedCreatorsScreen from './src/screens/SavedCreatorsScreen';
import RatingReviewScreen from './src/screens/RatingReviewScreen';
import ShopScreen from './src/screens/ShopScreen';
import ProductDetailsScreen from './src/screens/ProductDetailsScreen';
import MessagesListScreen from './src/screens/MessagesListScreen';
import EditConsultantProfileScreen from './src/screens/EditConsultantProfileScreen';
import MyProductsScreen from './src/screens/MyProductsScreen';
import AddEditProductScreen from './src/screens/AddEditProductScreen';
// Phase 3 — Creative Services Workflow
import ConsultantMatchingScreen from './src/screens/ConsultantMatchingScreen';
import GenerateWorkOrderScreen from './src/screens/GenerateWorkOrderScreen';
import ConsultantWorkOrderScreen from './src/screens/ConsultantWorkOrderScreen';
import RateConsultantScreen from './src/screens/RateConsultantScreen';

// Phase 4 — Product B: Artwork Marketplace
import ArtistSalesRequestScreen from './src/screens/ArtistSalesRequestScreen';
import ArtistOrderDispatchScreen from './src/screens/ArtistOrderDispatchScreen';
import ArtworkOrderTrackingScreen from './src/screens/ArtworkOrderTrackingScreen';
import ArtworkPaymentScreen from './src/screens/ArtworkPaymentScreen';
import CreatorDashboardScreen from './src/screens/CreatorDashboardScreen';

// Phase 5 — Consultant Management Screens
import ConsultantEarningsHistoryScreen from './src/screens/ConsultantEarningsHistoryScreen';
import ConsultantServicePricingScreen from './src/screens/ConsultantServicePricingScreen';
import ConsultantProjectManagementScreen from './src/screens/ConsultantProjectManagementScreen';
import ConsultantCategoryDetailsScreen from './src/screens/ConsultantCategoryDetailsScreen';

// Phase 6 — Remaining Figma Screens
import ConsultantPortfolioUpdateScreen from './src/screens/ConsultantPortfolioUpdateScreen';
import PaymentConfirmedScreen from './src/screens/PaymentConfirmedScreen';
import ArtistSalesRequestDetailScreen from './src/screens/ArtistSalesRequestDetailScreen';
import BookConsultantScreen from './src/screens/BookConsultantScreen';

// Phase 7 — Bidding with priority list + negotiation chat
import CreateBidScreen from './src/screens/CreateBidScreen';
import BidCandidatesScreen from './src/screens/BidCandidatesScreen';
import BidStatusScreen from './src/screens/BidStatusScreen';
import ConsultantBidInboxScreen from './src/screens/ConsultantBidInboxScreen';
import MyActivityScreen from './src/screens/MyActivityScreen';


const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator 
      tabBar={(props) => <BottomNavigation {...props} />} 
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      {/* CreatorProfile and AssignProject moved to the stack below — they are
          detail screens, not tabs, and a tab navigator has no history for
          their back buttons to pop. */}
      <Tab.Screen name="FloatingQuery" component={FloatingQueryScreen} />
      <Tab.Screen name="CreatorWorkorder" component={CreatorWorkorderScreen} />
      <Tab.Screen name="MyActivity" component={MyActivityScreen} />
      <Tab.Screen name="ConsultantBidInbox" component={ConsultantBidInboxScreen} />
      <Tab.Screen name="ConsultantProjectManagement" component={ConsultantProjectManagementScreen} />
      <Tab.Screen name="ConsultantEarningsHistory" component={ConsultantEarningsHistoryScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#e8e8e8' },
            gestureEnabled: true,
            // iOS: allow swipe-back from anywhere on screen, not just the left edge
            fullScreenGestureEnabled: true,
          }}
          initialRouteName="Splash"
        >
          <Stack.Screen name="Splash" component={AnimatedSplashScreen} />
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="EmailLogin" component={EmailLoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
          <Stack.Screen name="Intro" component={IntroScreen} />
          <Stack.Screen name="CreateCreatorAccount" component={CreateCreatorAccountScreen} />

          {/* Main Logged-In Flow with Fixed Bottom Navigation */}
          <Stack.Screen name="Main" component={MainTabs} />

          {/* Sub-screens (Bottom Nav hidden automatically when pushed) */}
          {/* Pushed detail screens: reached with a plain navigate() from tab
              screens, which bubbles up to this stack, so back/swipe/hardware
              back all pop correctly. */}
          <Stack.Screen name="CreatorProfile" component={CreatorProfileScreen} />
          <Stack.Screen name="AssignProject" component={AssignProjectScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="EditConsultantProfile" component={EditConsultantProfileScreen} />
          <Stack.Screen name="AssignMultiple" component={AssignMultipleScreen} />
          <Stack.Screen name="Terms" component={TermsScreen} />
          <Stack.Screen name="ClientWorkorder" component={ClientWorkorderScreen} />
          <Stack.Screen name="ClientReview" component={ClientReviewScreen} />
          <Stack.Screen name="Payment" component={PaymentScreen} />

          {/* Phase 3 — Creative Services Workflow (Product A) */}
          <Stack.Screen name="ConsultantMatching" component={ConsultantMatchingScreen} />
          <Stack.Screen name="GenerateWorkOrder" component={GenerateWorkOrderScreen} />
          <Stack.Screen name="ConsultantWorkOrder" component={ConsultantWorkOrderScreen} />
          <Stack.Screen name="RateConsultant" component={RateConsultantScreen} />
          {/* Consultant post-acceptance: confirmation, then per-project money view */}
          <Stack.Screen name="AssignmentAccepted" component={AssignmentAcceptedScreen} />
          <Stack.Screen name="AssignmentPayment" component={AssignmentPaymentScreen} />

          {/* Phase 4 — Product B: Artwork Marketplace */}
          <Stack.Screen name="ArtistSalesRequest" component={ArtistSalesRequestScreen} />
          <Stack.Screen name="ArtistOrderDispatch" component={ArtistOrderDispatchScreen} />
          <Stack.Screen name="ArtworkOrderTracking" component={ArtworkOrderTrackingScreen} />
          <Stack.Screen name="ArtworkPayment" component={ArtworkPaymentScreen} />
          <Stack.Screen name="CreatorDashboard" component={CreatorDashboardScreen} />

          {/* Phase 5 — Consultant Management */}
          <Stack.Screen name="ConsultantServicePricing" component={ConsultantServicePricingScreen} />
          <Stack.Screen name="ConsultantCategoryDetails" component={ConsultantCategoryDetailsScreen} />

          {/* Phase 6 — Remaining Figma Screens */}
          <Stack.Screen name="BookConsultant" component={BookConsultantScreen} />

          {/* Phase 7 — Bidding with priority list + negotiation chat */}
          <Stack.Screen name="CreateBid" component={CreateBidScreen} />
          <Stack.Screen name="BidCandidates" component={BidCandidatesScreen} />
          <Stack.Screen name="BidStatus" component={BidStatusScreen} />
          <Stack.Screen name="ConsultantPortfolioUpdate" component={ConsultantPortfolioUpdateScreen} />
          <Stack.Screen name="PaymentConfirmed" component={PaymentConfirmedScreen} />
          <Stack.Screen name="ArtistSalesRequestDetail" component={ArtistSalesRequestDetailScreen} />

          {/* Modals and Overlays */}
          <Stack.Screen name="Filter" component={FilterScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="PortfolioGallery" component={PortfolioGalleryScreen} options={{ presentation: 'fullScreenModal' }} />
          
          {/* Full screen features where bottom nav is usually hidden */}
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Invoice" component={InvoiceScreen} />
          <Stack.Screen name="SavedCreators" component={SavedCreatorsScreen} />
          <Stack.Screen name="RatingReview" component={RatingReviewScreen} />
          <Stack.Screen name="Shop" component={ShopScreen} />
          <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
          <Stack.Screen name="MessagesList" component={MessagesListScreen} />
          <Stack.Screen name="MyProducts" component={MyProductsScreen} />
          <Stack.Screen name="AddEditProduct" component={AddEditProductScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

// src/hooks/useAuth.js
import { useDispatch, useSelector } from 'react-redux';
import { login, logout } from '../store/slices/authSlice';
import { resetLocation } from '../store/slices/locationSlice';

const useAuth = () => {
    const dispatch = useDispatch();
    const { isLoggedIn, user, token } = useSelector((state) => state.auth);

    const signIn = (responseData) => {
        dispatch(login(responseData));
    };

    const signOut = () => {
        dispatch(logout());
        dispatch(resetLocation());
    };

    return {
        isLoggedIn,
        user,
        token,
        signIn,
        signOut,
    };
};

export default useAuth;
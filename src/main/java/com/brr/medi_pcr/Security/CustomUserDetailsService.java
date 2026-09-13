package com.brr.medi_pcr.Security;

import com.brr.medi_pcr.Entity.Role;
import com.brr.medi_pcr.Entity.User;
import com.brr.medi_pcr.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Override
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        Role role = user.getRole();
        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(role.name()));

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                user.isEnabled(), // enabled
                true,             // accountNonExpired
                true,             // credentialsNonExpired
                true,             // accountNonLocked
                authorities
        );
    }
}
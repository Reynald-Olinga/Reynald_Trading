import {
  Flex,
  Box,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Button,
  Heading,
  Text,
  InputGroup,
  InputRightElement,
  Link,
  HStack,
  useToast,
} from "@chakra-ui/react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import accounts from "../services/accounts.service";
import tokens from "../services/tokens.service";

export default function Login() {
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (tokens.isAuthenticated()) {
      navigate("/");
    }
  }, [navigate]);

  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
    showPassword: false
  });

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();

    try {
      const res = await accounts.login(
        loginData.username,
        loginData.password
      );
      console.log(loginData.username, loginData.password);
      
      
      if (res === "success") {
        toast({
          title: "Logged in! Redirecting to dashboard...",
          status: "success",
          isClosable: true,
        });
        navigate("/");
      } else {
        toast({
          title: typeof res === 'string' ? res : "Login failed",
          status: "error",
          isClosable: true,
        });
      }
    } catch (err) {
      toast({
        title: "Login failed",
        description: err instanceof Error ? err.message : "Unknown error",
        status: "error",
        isClosable: true,
      });
    }
  };

  return (
    <Flex align={"center"} justify={"center"}>
      <Stack spacing={8} mx={"auto"} maxW={"lg"} px={{ base: 0, md: 6 }}>
        <Stack align={"center"}>
          <Heading fontSize={"4xl"} textAlign="center">
            Log in to your account
          </Heading>
          <HStack spacing="1">
            <Text>Or</Text>
            <Link as={RouterLink} to="/signup" fontWeight="500">
              create an account
            </Link>
          </HStack>
        </Stack>
        <Box rounded={"lg"} boxShadow={"lg"} p={8} pt={{ base: 4, md: 8 }}>
          <form>
            <Stack spacing={4}>
              <FormControl id="username" isRequired>
                <FormLabel>Username</FormLabel>
                <Input
                  type="text"
                  onChange={(e) =>
                    setLoginData(prev => ({ ...prev, username: e.target.value }))
                  }
                />
              </FormControl>
              <FormControl id="password" isRequired>
                <FormLabel>Password</FormLabel>
                <InputGroup>
                  <Input
                    type={loginData.showPassword ? "text" : "password"}
                    onChange={(e) =>
                      setLoginData(prev => ({ ...prev, password: e.target.value }))
                    }
                  />
                  <InputRightElement h={"full"}>
                    <Button
                      variant={"ghost"}
                      onClick={() =>
                        setLoginData(prev => ({ ...prev, showPassword: !prev.showPassword }))
                      }
                    >
                      {loginData.showPassword ? <ViewIcon /> : <ViewOffIcon />}
                    </Button>
                  </InputRightElement>
                </InputGroup>
              </FormControl>
              <Stack spacing={10} alignItems="center">
                <Button type="submit" onClick={handleSubmit}>
                  Log in
                </Button>
              </Stack>
            </Stack>
          </form>
        </Box>
      </Stack>
    </Flex>
  );
}













// Minimal uploadable C++20 bot for AlgoPoker @ GT.

#include <iostream>
#include <string>

bool is_true(const std::string& observation, const std::string& field) {
    return observation.find("\"" + field + "\":true") != std::string::npos;
}

std::string choose_action(const std::string& observation) {
    // YOUR Job: Replace this check/call strategy with your own logic.
    // The program receives the complete observation as one compact JSON line.
    if (is_true(observation, "can_check")) {
        return R"({"action":"check"})";
    }
    if (is_true(observation, "can_call")) {
        return R"({"action":"call"})";
    }
    return R"({"action":"fold"})";
}

// DO NOT CHANGE BELOW. IT WILL ABSOLUTELY BREAK YOUR BOT. PLS AND THANK YOU
int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    std::string observation;
    while (std::getline(std::cin, observation)) {
        std::cout << choose_action(observation) << '\n' << std::flush;
    }
    return 0;
}


<?php

/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * Linkoone implementation : © Geoffrey VOYER <geoffrey.voyer@gmail.com>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * stats.inc.php
 *
 * Linkoone game statistics description
 *
 */

/*
    In this file, you are describing game statistics, that will be displayed at the end of the
    game.
    
    !! After modifying this file, you must use "Reload  statistics configuration" in BGA Studio backoffice
    ("Control Panel" / "Manage Game" / "Your Game")
    
    There are 2 types of statistics:
    _ table statistics, that are not associated to a specific player (ie: 1 value for each game).
    _ player statistics, that are associated to each players (ie: 1 value for each player in the game).

    Statistics types can be "int" for integer, "float" for floating point values, and "bool" for boolean
    
    Once you defined your statistics there, you can start using "initStat", "setStat" and "incStat" method
    in your game logic, using statistics names defined below.
    
    !! It is not a good idea to modify this file when a game is running !!

    If your game is already public on BGA, please read the following before any change:
    http://en.doc.boardgamearena.com/Post-release_phase#Changes_that_breaks_the_games_in_progress
    
    Notes:
    * Statistic index is the reference used in setStat/incStat/initStat PHP method
    * Statistic index must contains alphanumerical characters and no space. Example: 'turn_played'
    * Statistics IDs must be >=10
    * Two table statistics can't share the same ID, two player statistics can't share the same ID
    * A table statistic can have the same ID than a player statistics
    * Statistics ID is the reference used by BGA website. If you change the ID, you lost all historical statistic data. Do NOT re-use an ID of a deleted statistic
    * Statistic name is the English description of the statistic as shown to players
    
*/

$stats_type = array(

    // Statistics global to table
    "table" => array(),

    // Statistics existing for each player
    "player" => array(

        "turns_number" => array(
            "id" => 10,
            "name" => totranslate("Turns"),
            "type" => "int"
        ),

        "collected_cards_number" => array(
            "id" => 11,
            "name" => totranslate("Collected cards"),
            "type" => "int"
        ),

        "discarded_cards_number" => array(
            "id" => 12,
            "name" => totranslate("Cards discarded before a new round"),
            "type" => "int"
        ),

        "draw_number" => array(
            "id" => 13,
            "name" => totranslate("Draw actions"),
            "type" => "int"
        ),

        "collect_action_number" => array(
            "id" => 14,
            "name" => totranslate("Play and collect actions"),
            "type" => "int"
        ),

        "no_collect_action_number" => array(
            "id" => 15,
            "name" => totranslate("Play but don't collect anything actions"),
            "type" => "int"
        ),

        "new_hand_triggerred_number" => array(
            "id" => 16,
            "name" => totranslate("New round triggered"),
            "type" => "int"
        ),

        "new_hand_suffered_number" => array(
            "id" => 17,
            "name" => totranslate("New round triggered by opponents"),
            "type" => "int"
        ),

        "win_32_number" => array(
            "id" => 18,
            "name" => totranslate("Victories with twice three birds collected"),
            "type" => "int"
        ),

        "win_17_number" => array(
            "id" => 19,
            "name" => totranslate("Victories with seven different birds collected"),
            "type" => "int"
        ),

        "win_deck_exhausted_number" => array(
            "id" => 20,
            "name" => totranslate("Victories when deck was empty"),
            "type" => "int"
        ),

        "loss_32_number" => array(
            "id" => 21,
            "name" => totranslate("Losses with twice three birds collected"),
            "type" => "int"
        ),

        "loss_17_number" => array(
            "id" => 22,
            "name" => totranslate("Losses with seven different birds collected"),
            "type" => "int"
        ),

        "loss_deck_exhausted_number" => array(
            "id" => 23,
            "name" => totranslate("Losses when deck was empty"),
            "type" => "int"
        ),

        "small_flock_number" => array(
            "id" => 24,
            "name" => totranslate("Small flocks completed"),
            "type" => "int"
        ),

        "big_flock_number" => array(
            "id" => 25,
            "name" => totranslate("Big flocks completed"),
            "type" => "int"
        ),

        "unplayed_flock_number" => array(
            "id" => 26,
            "name" => totranslate("Flocks not completed by choice"),
            "type" => "int"
        ),

        "collected_t0_number" => array(
            "id" => 27,
            "name" => totranslate("Pink flamingos earned"),
            "type" => "int"
        ),

        "collected_t1_number" => array(
            "id" => 28,
            "name" => totranslate("Owls earned"),
            "type" => "int"
        ),

        "collected_t2_number" => array(
            "id" => 29,
            "name" => totranslate("Toucans earned"),
            "type" => "int"
        ),

        "collected_t3_number" => array(
            "id" => 30,
            "name" => totranslate("Ducks earned"),
            "type" => "int"
        ),

        "collected_t4_number" => array(
            "id" => 31,
            "name" => totranslate("Parrots earned"),
            "type" => "int"
        ),

        "collected_t5_number" => array(
            "id" => 32,
            "name" => totranslate("Magpies earned"),
            "type" => "int"
        ),

        "collected_t6_number" => array(
            "id" => 33,
            "name" => totranslate("Reed warblers earned"),
            "type" => "int"
        ),

        "collected_t7_number" => array(
            "id" => 34,
            "name" => totranslate("Robins earned"),
            "type" => "int"
        ),
        
    )

);

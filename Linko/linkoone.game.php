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
 * linkoone.game.php
 *
 * This is the main file for your game logic.
 *
 * In this PHP file, you are going to defines the rules of the game.
 *
 */


require_once(APP_GAMEMODULE_PATH . 'module/table/table.game.php');


class Linkoone extends Table
{
    function __construct()
    {
        // Your global variables labels:
        //  Here, you can assign labels to global variables you are using for this game.
        //  You can use any number of global variables with IDs between 10 and 99.
        //  If your game has options (variants), you also have to associate here a label to
        //  the corresponding ID in gameoptions.inc.php.
        // Note: afterwards, you can get/set the global variables with getGameStateValue/setGameStateInitialValue/setGameStateValue
        parent::__construct();

        self::initGameStateLabels(array(
            //    "my_first_global_variable" => 10,
            //    "my_second_global_variable" => 11,
            //      ...
            //    "my_first_game_variant" => 100,
            //    "my_second_game_variant" => 101,
            //      ...
        ));
        $this->numberOfCardsPerType = [7, 10, 10, 13, 13, 17, 20, 20]; // Number of cards for each type of cards. Key is the type_id of the card (0 to 7, as in ims/linkoone_cards)
        $this->smallFlockNumbers = [2, 3, 3, 4, 4, 5, 6, 6];
        $this->bigFlockNumbers = [3, 4, 4, 6, 6, 7, 9, 9];

        $this->typesNames = [clienttranslate("Pink flamingo"), clienttranslate("Owl"), clienttranslate("Toucan"), clienttranslate("Duck"), clienttranslate("Parrot"), clienttranslate("Magpie"), clienttranslate("Reed warbler"), clienttranslate("Robin")];
        $this->typesNamesPlural = [clienttranslate("Pink flamingos"), clienttranslate("Owls"), clienttranslate("Toucans"), clienttranslate("Ducks"), clienttranslate("Parrots"), clienttranslate("Magpies"), clienttranslate("Reed warblers"), clienttranslate("Robins")];

        $this->linesNames = [clienttranslate("first line"), clienttranslate("second line"), clienttranslate("third line"), clienttranslate("fourth line")];

        $this->cards = self::getNew("module.common.deck");
        $this->cards->autoreshuffle = true;
        $this->cards->init("card");
    }

    protected function getGameName()
    {
        // Used for translations and stuff. Please do not modify.
        return "linkoone";
    }

    /*
        setupNewGame:
        
        This method is called only once, when a new game is launched.
        In this method, you must setup the game according to the game rules, so that
        the game is ready to be played.
    */
    protected function setupNewGame($players, $options = array())
    {
        // Set the colors of the players with HTML color code
        // The default below is red/green/blue/orange/brown
        // The number of colors defined here must correspond to the maximum number of players allowed for the gams
        $gameinfos = self::getGameinfos();
        $default_colors = $gameinfos['player_colors'];

        // Create players
        // Note: if you added some extra field on "player" table in the database (dbmodel.sql), you can initialize it there.
        $sql = "INSERT INTO player (player_id, player_color, player_canal, player_name, player_avatar) VALUES ";
        $values = array();
        foreach ($players as $player_id => $player) {
            $color = array_shift($default_colors);
            $values[] = "('" . $player_id . "','$color','" . $player['player_canal'] . "','" . addslashes($player['player_name']) . "','" . addslashes($player['player_avatar']) . "')";
        }
        $sql .= implode($values, ',');
        self::DbQuery($sql);
        self::reattributeColorsBasedOnPreferences($players, $gameinfos['player_colors']);
        self::reloadPlayersBasicInfos();

        /************ Start the game initialization *****/

        // Create cards
        $cards = array();
        for ($typeId = 0; $typeId <= 7; ++$typeId) {
            $cards[] = array('type' => $typeId, 'type_arg' => 0, 'nbr' => $this->numberOfCardsPerType[$typeId]);
        }

        $this->cards->createCards($cards, 'deck');
        $this->cards->shuffle('deck');

        $this->initializePlayersHand();
        $this->initializeTableLines();
        $this->initializeStatistics();
        $this->giveInitialBirdToEachPlayer();

        // Activate first player (which is in general a good idea :) )
        $this->activeNextPlayer();

        /************ End of the game initialization *****/
    }

    protected function initializeStatistics()
    {
        $all_stats = $this->getStatTypes();
        $player_stats = $all_stats['player'];

        foreach ($player_stats as $key => $value) {
            if ($value['id'] >= 10) {
                $this->initStat('player', $key, 0);
            }
        }
    }

    protected function initializePlayersHand()
    {
        $players = self::loadPlayersBasicInfos();
        foreach ($players as $player_id => $player) {
            $cards = $this->cards->pickCards(8, 'deck', $player_id);
        }
        if (count($cards) < 8) {
            //The last player didn't received 8 cards, because the deck (plus discard due to auto-reshuffle), can't provide them.
            $this->gamestate->nextState("noCardsLeft");
        }
    }

    protected function initializeTableLines()
    {
        //We should have 3 cards of different types on each line.
        for ($lineId = 0; $lineId <= 3; ++$lineId) {
            $types = [];
            $cards_to_be_returned = [];
            while (count($types) < 3) {
                $card = $this->cards->pickCardForLocation('deck', 'line' . $lineId, count($types));
                // var_dump('line' . $lineId);
                if (in_array($card["type"], $types)) {
                    // A card of this type already exists on the line, we will put it back in the deck
                    array_push($cards_to_be_returned, $card["id"]);
                } else {
                    array_push($types, $card["type"]);
                }
            }
            $this->cards->moveCards($cards_to_be_returned, 'deck');
        }
    }

    protected function giveInitialBirdToEachPlayer()
    {
        $players = self::loadPlayersBasicInfos();
        foreach ($players as $player_id => $player) {
            $wonCard = $this->cards->pickCardForLocation('deck', 'won', $player_id);
            self::incStat(1, "collected_t" . $wonCard["type"] . "_number", $player_id);
        }
    }
    /*
        getAllDatas: 
        
        Gather all informations about current game situation (visible by the current player).
        
        The method is called each time the game interface is displayed to a player, ie:
        _ when the game starts
        _ when a player refreshes the game page (F5)
    */
    protected function getAllDatas()
    {
        $result = array();

        $current_player_id = self::getCurrentPlayerId();    // !! We must only return informations visible by this player !!

        // Get information about players
        // Note: you can retrieve some extra field you added for "player" table in "dbmodel.sql" if you need it.
        $sql = "SELECT player_id id, player_score score FROM player ";
        $result['players'] = self::getCollectionFromDb($sql);

        // Players ordered by turn sequence
        $result['turn'] = self::getNextPlayerTable();

        // TODO: Gather all information about current game situation (visible by player $current_player_id).
        // Cards in player hand
        $result['hand'] = $this->cards->getCardsInLocation('hand', $current_player_id);

        for ($lineId = 0; $lineId <= 3; ++$lineId) {
            $result['lines'][$lineId] = $this->cards->getCardsInLocation('line' . $lineId, null, "location_arg");
        }

        $result['won'] = $this->cards->getCardsInLocation('won');


        $result['count']['players'] = $this->cards->countCardsByLocationArgs('hand');
        $result['count']['deck'] = $this->cards->countCardInLocation('deck');
        $result['count']['discard'] = $this->cards->countCardInLocation('discard');

        $result['numberOfCardsPerType'] = $this->numberOfCardsPerType;
        $result['smallFlockNumbers'] = $this->smallFlockNumbers;
        $result['bigFlockNumbers'] = $this->bigFlockNumbers;
        $result['typesNames'] = $this->typesNames;
        $result['typesNamesPlural'] = $this->typesNamesPlural;


        $result['cards_played'] = array();
        foreach( $result['players'] as $player_id => $player ) {
            $result['cards_played'][$player_id] = $this->cards->getCardsInLocation( 'won', $player_id );
        }

        return $result;
    }

    /*
        getGameProgression:
        
        Compute and return the current game progression.
        The number returned must be an integer beween 0 (=the game just started) and
        100 (= the game is finished or almost finished).
    
        This method is called each time we are in a game state with the "updateGameProgression" property set to true 
        (see states.inc.php)
    */
    function getGameProgression()
    {
        $sql_statement = "SELECT MAX(won_card) FROM ( SELECT COUNT(*) as won_card FROM card WHERE `card_location`='won' GROUP BY `card_location_arg`) as toto";
        $max_won_cards = intval(self::getUniqueValueFromDB($sql_statement));

        if ($max_won_cards <= 8) {
            return 10 * $max_won_cards;
        } else {
            return 90;
        }
    }


    //////////////////////////////////////////////////////////////////////////////
    //////////// Utility functions
    ////////////    

    /*
        In this space, you can put any utility methods useful for your game logic
    */

    function collectCards($line_cards, $position, $type_id, $player_id)
    // This function collects the intermediate cards when a players play cards of a given type, on a given line, at a given position.
    {
        // self::trace("___________________________COLLECT____________________");
        // self::trace(json_encode($line_cards));
        // self::trace($position);
        // self::trace($type_id);
        // self::trace($player_id);
        $map_function = function ($elt) {
            return $elt['id'];
        };

        if ($line_cards[0]['type'] == $type_id) {
            return [];
        } else {
            $cards_to_collect = [];
            foreach ($line_cards as $line_card) {
                if ($line_card['type'] == $type_id) {
                    $this->cards->moveCards(array_map($map_function, $cards_to_collect), 'hand', $player_id);
                    return $cards_to_collect;
                } else {
                    array_push($cards_to_collect, $line_card);
                }
            }
            return [];
        }
    }

    function putPlayedCardsOnLine($played_cards, $line_name, $new_arg)
    {
        $map_function = function ($elt) {
            return $elt['id'];
        };
        $played_cards_id = array_map($map_function, $played_cards);
        $this->cards->moveCards($played_cards_id, $line_name, $new_arg);
    }

    function completeLineIfNeeded($line_name, $new_arg, $position)
    {
        // TBD : Could be its own state?
        $line_cards = $this->cards->getCardsInLocation($line_name, null, 'location_arg');
        $first_type = $line_cards[0]["type"];
        foreach ($line_cards as $card) {
            if (!($card["type"] == $first_type)) {
                // We have at least two distinct types on the line, nothing to do
                return [];
            }
        }
        $added_cards = [];
        $location_arg = $new_arg;
        while (True) {
            $location_arg = $location_arg + $position;
            $added_card = $this->cards->pickCardForLocation('deck', $line_name, $location_arg);
            if ($added_card == null) {
                // TBD: If no more card, go to end of game.
                $this->gamestate->nextState("noCardsLeft");
                return $added_cards;
            }
            if (!($added_card["type"] == $first_type)) {
                //We have at least two distinct types on the line, stopping here
                array_push($added_cards, $added_card);
                return $added_cards;
            } else {
                array_push($added_cards, $added_card);
            }
        }
    }

    function performFlock($size, $player_id, $cards_to_flock)
    {
        //TBD : Give a name to this function and define it elsewhere (DRY)
        $map_function = function ($elt) {
            return $elt['id'];
        };
        $cards_id_to_flock = array_map($map_function, $cards_to_flock);
        $cards_to_win = array_slice($cards_id_to_flock, 0, intval($size));
        $cards_to_discard = array_slice($cards_id_to_flock, intval($size));
        $this->cards->moveCards($cards_to_win, 'won', $player_id);
        $this->cards->moveCards($cards_to_discard, 'discard');

        //Stats
        if (intval($size) == 1) {
            self::incStat(1, "small_flock_number", $player_id);
        } else {
            self::incStat(1, "big_flock_number", $player_id);
        }
        self::incStat($size, "collected_t" . array_values($cards_to_flock)[0]["type"] . "_number", $player_id);

        return array( 'won' => $cards_to_win, 'discarded' => $cards_to_discard );
    }

    function checkWinningConditions($player_id)
    {
        $won_cards = $this->cards->getCardsInLocation('won', $player_id);
        $wonCardsByType = self::groupCardsByType($won_cards);

        rsort($wonCardsByType);
        if ($wonCardsByType[1] >= 3) {
            return array(True, "32");
        }
        if ($wonCardsByType[6] >= 1) {
            return array(True, "17");
        }
        return array(False, "");;
    }

    function checkNoCardsInHand($player_id)
    {
        return (count($this->cards->getPlayerHand($player_id)) == 0);
    }

    function formatAsIconsByGroupOfTypes($cards_collected)
    {
        $cardsCollectedByType = self::groupCardsByType($cards_collected);
        $html = "<span class='bird_logs_display'>";
        for ($typeId = 0; $typeId <= 7; ++$typeId) {
            if ($cardsCollectedByType[$typeId] > 0) {
                $html .= " " . $cardsCollectedByType[$typeId] . " " . "<div class='bird_logs_icon bird_type_$typeId' title='".$this->typesNames[$typeId]."'></div>";
            }
        }
        $html .= "</span>";
        return $html;
    }

    function countBirdTypes($cards_collected)
    {
        $cardsCollectedByType = self::groupCardsByType($cards_collected);
        $count = 0;
        for ($typeId = 0; $typeId <= 7; ++$typeId) {
            if ($cardsCollectedByType[$typeId] > 0) {
                $count++;
            }
        }
        return $count;
    }

    function groupCardsByType($cards)
    {
        $cardsByType = [0, 0, 0, 0, 0, 0, 0, 0];

        foreach ($cards as $card_id => $card) {
            $cardsByType[$card["type"]] += 1;
        }

        return $cardsByType;
    }

    function isFlockPossible()
    {
        $player_id = self::getActivePlayerId();
        $cards = $this->cards->getCardsInLocation('hand', $player_id);
        $cardsByType = self::groupCardsByType($cards);

        foreach ($cardsByType as $type => $number) {
            if ($number >= $this->smallFlockNumbers[$type])
                return true;
        }
        return false;
    }

    function notifyPlayCard($line_id, $type_id, $played_cards, $cards_collected, $position)
    {
        $line = $this->cards->getCardsInLocation(self::getLineName($line_id));
        $msg = clienttranslate('${player_name} lays ${type_name_displayed} on the ${line_name} and collects ${collected_displayed}');
        if ($this->countBirdTypes($cards_collected) <= 0) {
            $msg = clienttranslate('${player_name} lays ${type_name_displayed} on the ${line_name} and doesn\'t collect any bird');
        }
        self::notifyAllPlayers('playCard', $msg, array(
            'i18n' => array('type_name_displayed', 'collected_displayed', 'line_name'),
            'player_name' => self::getActivePlayerName(),
            'player_id' => self::getActivePlayerId(),
            'line_name' => $this->linesNames[$line_id],
            'line_id' => $line_id,
            'line' => $line,
            'type_id' => $type_id,
            'position' => $position,
            'type_name_displayed' => self::formatAsIconsByGroupOfTypes($played_cards),
            'collected_displayed' => self::formatAsIconsByGroupOfTypes($cards_collected),
            'number_of_cards' => count($played_cards),
            'collected_cards' => $cards_collected,
            'played_cards' => array_values(array_intersect_key($line, $played_cards)), // we get the new location_arg of played cards in a clean array.
        ));
    }

    function notifyLineCompleted($line_id, $added_cards)
    {
        self::notifyAllPlayers('lineCompleted', clienttranslate('Cards are drawn to complete the ${line_name}: ${collected_displayed}'), array(
            'i18n' => array('collected_displayed', 'line_name'),
            'line_name' => $this->linesNames[$line_id],
            'line_id' => $line_id,
            'line' => $this->cards->getCardsInLocation(self::getLineName($line_id)),
            'collected_displayed' => self::formatAsIconsByGroupOfTypes($added_cards),
            'added_cards' => $added_cards,
            'new_deck_count' => $this->cards->countCardsInLocation('deck'),
            'new_discard_count' => $this->cards->countCardsInLocation('discard'),
        ));
    }

    function notifyHandUpdated($player_id)
    {
        $cards = $this->cards->getCardsInLocation('hand', $player_id);
        $deck_count = $this->cards->countCardInLocation('deck');
        $discard_count = $this->cards->countCardInLocation('discard');
        self::notifyPlayer($player_id, 'handUpdated', '', array('hand' => $this->cards->getCardsInLocation('hand', $player_id)));
        self::notifyAllPlayers('newHandCount', "", array(
            // 'i18n' => array('color_displayed', 'value_displayed'), // TBD : How doesit works???
            'new_count' => count($cards),
            'player_id' => $player_id,
            'new_deck_count' => $deck_count,
            'new_discard_count' => $discard_count,
        ));
    }

    function notifyCardsDrawn($player_id, $new_cards)
    {
        $cards = $this->cards->getCardsInLocation('hand', $player_id);
        $deck_count = $this->cards->countCardInLocation('deck');
        $discard_count = $this->cards->countCardInLocation('discard');
        self::notifyPlayer($player_id, 'cardsDrawn', '', array('new_cards' => $new_cards));
        self::notifyAllPlayers('newHandCount', clienttranslate('${player_name} draws two cards'), array(
            'new_count' => count($cards),
            'player_id' => $player_id,
            'player_name' => self::getActivePlayerName(),
            'new_deck_count' => $deck_count,
            'new_discard_count' => $discard_count,
            'cards_drawn_number' => count($new_cards),
        ));
    }

    function notifyNewHand($player_id)
    {
        self::notifyAllPlayers(
            'newHand',
            clienttranslate('${player_name} has no cards left in hand! A new round starts.'),
            array(
                'player_id' => $player_id,
                'player_name' => self::getActivePlayerName(),
            )
        );
    }

    function notifyFlockCompleted($player_id, $type_id, $cards_to_flock, $size, $cards_won_ids, $cards_discarded_ids)
    {
        self::notifyAllPlayers(
            'flockCompleted',
            clienttranslate('${player_name} completes a flock of ${type_name_displayed} and earns ${card_won_displayed}'),
            array(
                'i18n' => array('type_name_displayed', 'card_won_displayed'),
                'player_id' => $player_id,
                'player_name' => self::getActivePlayerName(),
                'type' => $type_id,
                'type_name_displayed' => self::formatAsIconsByGroupOfTypes($cards_to_flock),
                'card_won_displayed' => self::formatAsIconsByGroupOfTypes(array_slice($cards_to_flock, 0, $size)),
                'flock_count' => count($cards_to_flock),
                'cards_won' => $size,
                'cards_won_ids' => $cards_won_ids,
                'cards_discarded_ids' => $cards_discarded_ids,
            )
        );
    }

    function getLineName($line_id)
    {
        //return the name of the line as used in the database
        return 'line' . $line_id;
    }
    //////////////////////////////////////////////////////////////////////////////
    //////////// Player actions
    //////////// 

    /*
        Each time a player is doing some game action, one of the methods below is called.
        (note: each method below must match an input method in linkoone.action.php)
    */
    function play($type_id, $line_id, $position)
    {
        self::checkAction("play");
        $player_id = self::getActivePlayerId();
        $line_name = self::getLineName($line_id);

        $played_cards = $this->cards->getCardsOfTypeInLocation($type_id, null, 'hand', $player_id);
        if (count($played_cards) == 0) {
            throw new BgaUserException(sprintf(_("You should play a type of bird you have in your hand!")));
        }

        // Line cards ordered so that closest from the position is the first one of the array.
        $line_cards = $this->cards->getCardsInLocation($line_name, null, 'location_arg');
        if ($position == 1) {
            $line_cards = array_reverse($line_cards);
        }

        $cards_collected = $this->collectCards($line_cards, $position, $type_id, $player_id);

        $new_arg = $line_cards[0]['location_arg'] + $position;
        $this->putPlayedCardsOnLine($played_cards, $line_name, $new_arg);

        $added_cards = $this->completeLineIfNeeded($line_name, $new_arg, $position);

        self::notifyPlayCard($line_id, $type_id, $played_cards, $cards_collected, $position);

        if (count($added_cards) > 0) {
            self::notifyLineCompleted($line_id, $added_cards);
        }

        if (count($cards_collected) > 0) {
            self::incStat(1, "collect_action_number", $player_id);
            self::incStat(count($cards_collected), "collected_cards_number", $player_id);

            $this->gamestate->nextState("flockOption");
        } else {
            //Draw option.
            $this->gamestate->nextState("drawOption");
        }
    }

    function draw()
    {
        self::checkAction("draw");
        $player_id = self::getActivePlayerId();
        self::incStat(1, "draw_number", $player_id);

        $added_cards = $this->cards->pickCards(2, 'deck', $player_id);
        self::notifyCardsDrawn($player_id, $added_cards);
        
        if (count($added_cards) < 2) {
            $this->gamestate->nextState("noCardsLeft");
        }
        $this->gamestate->nextState("flockOption");
    }

    function passDraw()
    {
        self::checkAction("pass");

        $player_id = self::getActivePlayerId();
        self::incStat(1, "no_collect_action_number", $player_id);

        self::notifyAllPlayers('PassChoice', clienttranslate('${player_name} chooses not to draw two cards'), array(
            // 'i18n' => array('color_displayed', 'value_displayed'), // TBD : How doesit works???
            'player_name' => self::getActivePlayerName(),
        ));
        $this->gamestate->nextState("flockOption");
    }

    function passFlock( $noCardsLeft=false )
    {
        self::checkAction("pass");
        
        if (!$noCardsLeft) {
            // Player made the choice to pass
            self::notifyAllPlayers('PassChoice', clienttranslate('${player_name} passes'), array(
                // 'i18n' => array('color_displayed', 'value_displayed'), // TBD : How doesit works???
                'player_name' => self::getActivePlayerName(),
            ));
            if (self::isFlockPossible())
                self::incStat(1, "unplayed_flock_number", self::getActivePlayerId());
        }
        
        $this->gamestate->nextState("nextPlayer");
    }

    function completeFlock($type_id)
    {
        self::checkAction("completeFlock");
        $player_id = self::getActivePlayerId();
        $cards_to_flock = $this->cards->getCardsOfTypeInLocation($type_id, null, 'hand', $player_id);
        if (count($cards_to_flock) >= $this->bigFlockNumbers[$type_id]) {
            $size = 2;
            $result = $this->performFlock($size, $player_id, $cards_to_flock);
        } elseif (count($cards_to_flock) >= $this->smallFlockNumbers[$type_id]) {
            $size = 1;
            $result = $this->performFlock($size, $player_id, $cards_to_flock);
        } else {
            throw new BgaUserException(sprintf(_("Not enough birds: you need at least %s to complete this flock"), $this->smallFlockNumbers[$type_id]));
        }
        self::notifyFlockCompleted($player_id, $type_id, $cards_to_flock, $size, $result['won'], $result['discarded']);

        $this->gamestate->nextState("nextPlayer");
    }

    //////////////////////////////////////////////////////////////////////////////
    //////////// Game state arguments
    ////////////

    /*
        Here, you can create methods defined as "game state arguments" (see "args" property in states.inc.php).
        These methods function is to return some additional information that is specific to the current
        game state.
    */

    /*
    
    Example for game state "MyGameState":
    
    function argMyGameState()
    {
        // Get some values from the current game situation in database...
    
        // return values:
        return array(
            'variable1' => $value1,
            'variable2' => $value2,
            ...
        );
    }    
    */

    //////////////////////////////////////////////////////////////////////////////
    //////////// Game state actions
    ////////////

    /*
        Here, you can create methods defined as "game state actions" (see "action" property in states.inc.php).
        The action method of state X is called everytime the current game state is set to X.
    */

    function stNextPlayer()
    {
        $active_player_id = self::getActivePlayerId();
        $winning_condition = self::checkWinningConditions($active_player_id);
        if ($winning_condition[0]) {
            self::DbQuery("UPDATE player SET player_score=1 WHERE player_id='" . $active_player_id . "'");

            //Update statistics
            $players = self::loadPlayersBasicInfos();
            foreach ($players as $player_id => $player) {
                if ($player_id == $active_player_id) {
                    self::incStat(1, "win_" . $winning_condition[1] . "_number", $player_id);
                } else {
                    self::incStat(1, "loss_" . $winning_condition[1] . "_number", $player_id);
                }
            }

            // Notify end of game score
            if ($winning_condition[1] == 32) {
                self::notifyAllPlayers('endOfGameScore', clienttranslate('${player_name} has 2 species of at least 3 birds in their collection and wins the game!'), array(
                    'player_name' => self::getActivePlayerName(),
                    'scores' => self::getCollectionFromDB("SELECT player_id id, player_score score FROM player WHERE player_score > 0")
                ));
            }        
            if ($winning_condition[1] == 17) {
                self::notifyAllPlayers('endOfGameScore', clienttranslate('${player_name} has 7 different species in their collection and wins the game!'), array(
                    'player_name' => self::getActivePlayerName(),
                    'scores' => self::getCollectionFromDB("SELECT player_id id, player_score score FROM player WHERE player_score > 0")
                ));
            }
            
            $this->gamestate->nextState("endGame");
        } elseif (self::checkNoCardsInHand($active_player_id)) {
            self::notifyNewHand($active_player_id);
            $this->gamestate->nextState("newHand");
        } else {
            $new_player_id = self::activeNextPlayer();
            self::giveExtraTime($new_player_id);
            $this->gamestate->nextState("nextPlayer");
        }
    }

    function stNewHand()
    {
        $active_player_id = self::getActivePlayerId();
        //Update statistics
        $players = self::loadPlayersBasicInfos();
        foreach ($players as $player_id => $player) {
            $cards_to_discard = $this->cards->getCardsInLocation('hand', $player_id);
            $discarded_number = count($cards_to_discard);
            self::incStat($discarded_number, "discarded_cards_number", $player_id);
            if ($player_id == $active_player_id) {
                self::incStat(1, "new_hand_triggerred_number", $player_id);
            } else {
                self::incStat(1, "new_hand_suffered_number", $player_id);
            }
            // Discard
            $this->cards->moveAllCardsInLocation('hand', 'discard', $player_id);
            // Nofify
            self::notifyAllPlayers('handDiscarded', "", array(
                // 'i18n' => array('color_displayed', 'value_displayed'), // TBD : How doesit works???
                'player_id' => $player_id,
                'cards_to_discard' => $cards_to_discard,
                'number_to_discard' => count($cards_to_discard),
            ));
        }

        // Small pause
        self::notifyAllPlayers('wait2seconds', '', array());

        // Replenish hands
        $this->initializePlayersHand();

        $players = self::loadPlayersBasicInfos();
        foreach ($players as $player_id => $player) {
            self::notifyHandUpdated($player_id);
        }

        self::giveExtraTime($active_player_id);
        $this->gamestate->nextState("playAgain");
    }

    function stNoCardLeft()
    {
        $players = self::loadPlayersBasicInfos();
        foreach ($players as $player_id => $player) {
            $won_cards = $this->cards->countCardInLocation('won', $player_id);
            self::DbQuery("UPDATE player SET player_score=" . $won_cards . " WHERE player_id='" . $player_id . "'");
        }
        
        //Statistics
        $scores = self::getCollectionFromDB("SELECT player_id id, player_score score FROM player ORDER BY score DESC");
        $max_score = $scores[0]['score'];
        foreach ($scores as $key => $line) {
            if ($line['score'] == $max_score) {
                self::incStat(1, "win_deck_exhausted_number", $line['id']);
            } else {
                self::incStat(1, "loss_deck_exhausted_number", $line['id']);
            }
        }

        // In this game, winners/losers are not ranked between themselves: adjust the score to 1 or 0
        self::DbQuery("UPDATE player SET player_score=0 WHERE player_score != '$max_score'");
        self::DbQuery("UPDATE player SET player_score=1 WHERE player_score = '$max_score'");

        // Notify end of game score
        self::notifyAllPlayers('endOfGameScore', clienttranslate('Not enough cards left for a new round: the game ends. The player with the most bird cards in their collection wins the game!'), array(
            'scores' => self::getCollectionFromDB("SELECT player_id id, player_score score FROM player WHERE player_score > 0")
        ));
        
        $this->gamestate->nextState("endGame");
    }

    function stPlayerTurn()
    {
        $player_id = self::getActivePlayerId();
        self::incStat(1, "turns_number", $player_id);
    }

    function stPlayerFlockChooser()
    {
        $player_id = self::getActivePlayerId();
        if (self::checkNoCardsInHand($player_id)) {
            // Pass immediately
            $this->passFlock( true );
        }
    }
    
    //////////////////////////////////////////////////////////////////////////////
    //////////// Zombie
    ////////////

    /*
        zombieTurn:
        
        This method is called each time it is the turn of a player who has quit the game (= "zombie" player).
        You can do whatever you want in order to make sure the turn of this player ends appropriately
        (ex: pass).
        
        Important: your zombie code will be called when the player leaves the game. This action is triggered
        from the main site and propagated to the gameserver from a server, not from a browser.
        As a consequence, there is no current player associated to this action. In your zombieTurn function,
        you must _never_ use getCurrentPlayerId() or getCurrentPlayerName(), otherwise it will fail with a "Not logged" error message. 
    */

    function zombieTurn($state, $active_player)
    {
        $statename = $state['name'];

        if ($state['type'] === "activeplayer") {
            switch ($statename) {
                default:
                    $this->gamestate->nextState("zombiePass");
                    break;
            }

            return;
        }

        if ($state['type'] === "multipleactiveplayer") {
            // Make sure player is in a non blocking status for role turn
            $this->gamestate->setPlayerNonMultiactive($active_player, '');

            return;
        }

        throw new feException("Zombie mode not supported at this game state: " . $statename);
    }

    ///////////////////////////////////////////////////////////////////////////////////:
    ////////// DB upgrade
    //////////

    /*
        upgradeTableDb:
        
        You don't have to care about this until your game has been published on BGA.
        Once your game is on BGA, this method is called everytime the system detects a game running with your old
        Database scheme.
        In this case, if you change your Database scheme, you just have to apply the needed changes in order to
        update the game database and allow the game to continue to run with your new version.
    
    */

    function upgradeTableDb($from_version)
    {
        // $from_version is the current version of this game database, in numerical form.
        // For example, if the game was running with a release of your game named "140430-1345",
        // $from_version is equal to 1404301345

        // Example:
        //        if( $from_version <= 1404301345 )
        //        {
        //            // ! important ! Use DBPREFIX_<table_name> for all tables
        //
        //            $sql = "ALTER TABLE DBPREFIX_xxxxxxx ....";
        //            self::applyDbUpgradeToAllDB( $sql );
        //        }
        //        if( $from_version <= 1405061421 )
        //        {
        //            // ! important ! Use DBPREFIX_<table_name> for all tables
        //
        //            $sql = "CREATE TABLE DBPREFIX_xxxxxxx ....";
        //            self::applyDbUpgradeToAllDB( $sql );
        //        }
        //        // Please add your future database scheme changes here
        //
        //


    }
}
